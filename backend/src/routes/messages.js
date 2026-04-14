const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const USER_SELECT = { id: true, display_name: true, username: true, avatar_url: true, anon_number: true, follower_count: true, following_count: true };

// Helper: get or create conversation between two users
async function getOrCreateConversation(userA, userB) {
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participant_ids: { has: userA } },
        { participant_ids: { has: userB } },
      ],
    },
  });
  if (existing) return existing;
  return prisma.conversation.create({
    data: { participant_ids: [userA, userB], status: 'pending' },
  });
}

// POST /api/messages/:recipientId — send a message
router.post('/:recipientId', requireAuth, async (req, res) => {
  try {
    const { body, image_url } = req.body;
    const recipientId = req.params.recipientId;
    const senderId = req.user.id;

    if (!body?.trim() && !image_url) return res.status(400).json({ error: 'Empty message' });
    if (senderId === recipientId) return res.status(400).json({ error: 'Cannot message yourself' });

    // Check if sender is blocked by recipient
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, blocked_user_ids: true, ...USER_SELECT },
    });
    if (!recipient) return res.status(404).json({ error: 'User not found' });

    if (recipient.blocked_user_ids?.includes(senderId)) {
      return res.status(403).json({ error: 'You cannot message this user' });
    }

    const conversation = await getOrCreateConversation(senderId, recipientId);

    // Admin account — always auto-accepted, bypasses request flow
    const senderUser = await prisma.user.findUnique({ where: { id: senderId }, select: { email: true } });
    const isAdminSender = senderUser?.email === 'kylebutler540@gmail.com';

    // Check if mutual follow (for auto-accepting)
    const [followedByMe, followedByThem] = await Promise.all([
      prisma.follow.findUnique({ where: { follower_id_following_id: { follower_id: senderId, following_id: recipientId } } }),
      prisma.follow.findUnique({ where: { follower_id_following_id: { follower_id: recipientId, following_id: senderId } } }),
    ]);
    const isMutualFollow = !!followedByMe && !!followedByThem;
    const isNewConversation = conversation.status === 'pending' && !conversation.last_message;

    // Auto-accept if mutual follows OR admin sender
    if ((isMutualFollow || isAdminSender) && conversation.status !== 'accepted') {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'accepted' },
      });
      conversation.status = 'accepted';
    }

    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        sender_id: senderId,
        recipient_id: recipientId,
        body: body?.trim() || '',
        image_url: image_url || null,
        status: 'sent',
      },
      include: { sender: { select: USER_SELECT }, recipient: { select: USER_SELECT } },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        last_message: body?.trim() || (image_url ? '📷 Photo' : ''),
        last_message_at: message.created_at,
        last_message_sender: senderId,
      },
    });

    // Fire notification for first message (request) — only on truly new conversations
    if (isNewConversation && conversation.status === 'pending') {
      const sender = await prisma.user.findUnique({ where: { id: senderId }, select: USER_SELECT });
      const senderName = sender?.display_name || sender?.username || (sender?.anon_number ? `User #${sender.anon_number}` : 'Someone');
      const preview = body?.trim() ? (body.trim().length > 60 ? body.trim().slice(0, 60) + '…' : body.trim()) : '📷 Photo';

      await prisma.notification.create({
        data: {
          user_id: recipientId,
          type: 'message_request',
          message: `${senderName} wants to message you`,
          data: {
            actor_id: senderId,
            actor_name: senderName,
            actor_avatar: sender?.avatar_url || null,
            preview,
            conversation_id: conversation.id,
          },
        },
      });

      const io = req.app.get('io');
      if (io) io.to(`user:${recipientId}`).emit('notification', { type: 'message_request' });
    }

    // Emit real-time events
    const io = req.app.get('io');
    if (io) {
      const payload = { ...message, conversation_id: conversation.id, conversation_status: conversation.status };
      io.to(`user:${recipientId}`).emit('new_message', payload);
      io.to(`user:${senderId}`).emit('message_sent', payload);
    }

    res.status(201).json({ ...message, conversation_id: conversation.id, conversation_status: conversation.status });
  } catch (err) {
    console.error('send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/messages/:userId/accept — accept a message request
router.post('/:userId/accept', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participant_ids: { has: currentUserId } },
          { participant_ids: { has: otherUserId } },
        ],
      },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: 'accepted' },
    });

    // Notify sender their request was accepted
    const acceptor = await prisma.user.findUnique({ where: { id: currentUserId }, select: USER_SELECT });
    const acceptorName = acceptor?.display_name || acceptor?.username || 'Someone';
    await prisma.notification.create({
      data: {
        user_id: otherUserId,
        type: 'message_accepted',
        message: `${acceptorName} accepted your message request`,
        data: { actor_id: currentUserId, actor_name: acceptorName, actor_avatar: acceptor?.avatar_url || null },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${otherUserId}`).emit('request_accepted', { conversation_id: conversation.id });
      io.to(`user:${currentUserId}`).emit('request_accepted', { conversation_id: conversation.id });
    }

    res.json({ ok: true, status: 'accepted' });
  } catch (err) {
    console.error('accept error:', err);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// POST /api/messages/:userId/reject — reject and block
router.post('/:userId/reject', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participant_ids: { has: currentUserId } },
          { participant_ids: { has: otherUserId } },
        ],
      },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    // Mark conversation as rejected (soft reject — not deleted, just hidden)
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: 'rejected' },
    });

    // Delete the message_request notification
    await prisma.notification.deleteMany({
      where: {
        user_id: currentUserId,
        type: 'message_request',
        data: { path: ['actor_id'], equals: otherUserId },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${currentUserId}`).emit('request_rejected', { conversation_id: conversation.id });
    }

    res.json({ ok: true, status: 'rejected' });
  } catch (err) {
    console.error('reject error:', err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// GET /api/messages/unread-count — total unread messages + pending requests
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await prisma.conversation.findMany({
      where: { participant_ids: { has: userId }, status: { not: 'rejected' } },
      select: { id: true, status: true, participant_ids: true },
    });
    // Count unread messages across all accepted conversations
    const unreadMessages = await prisma.message.count({
      where: {
        conversation_id: { in: conversations.filter(c => c.status === 'accepted').map(c => c.id) },
        recipient_id: userId,
        read: false,
      },
    });
    // Count pending requests (incoming only)
    const pendingRequests = conversations.filter(c => c.status === 'pending').length;
    res.json({ count: unreadMessages + pendingRequests });
  } catch (err) {
    console.error('unread-count error:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// GET /api/messages/inbox
router.get('/inbox', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participant_ids: { has: userId },
        status: { not: 'rejected' },
      },
      orderBy: { last_message_at: 'desc' },
    });

    const result = await Promise.all(conversations.map(async (conv) => {
      const partnerId = conv.participant_ids.find(id => id !== userId);
      if (!partnerId) return null;

      const [partner, unreadCount, followedByMe, followedByThem] = await Promise.all([
        prisma.user.findUnique({ where: { id: partnerId }, select: USER_SELECT }),
        prisma.message.count({ where: { conversation_id: conv.id, recipient_id: userId, read: false } }),
        prisma.follow.findUnique({ where: { follower_id_following_id: { follower_id: userId, following_id: partnerId } } }),
        prisma.follow.findUnique({ where: { follower_id_following_id: { follower_id: partnerId, following_id: userId } } }),
      ]);

      return {
        conversation_id: conv.id,
        conversation_status: conv.status, // 'pending' | 'accepted'
        user: partner,
        lastMessage: conv.last_message ? {
          body: conv.last_message,
          created_at: conv.last_message_at,
          sender_id: conv.last_message_sender,
        } : null,
        unread: unreadCount,
        isFriend: !!followedByMe && !!followedByThem,
      };
    }));

    res.json(result.filter(Boolean));
  } catch (err) {
    console.error('inbox error:', err);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// GET /api/messages/conversation/:userId
router.get('/conversation/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participant_ids: { has: currentUserId } },
          { participant_ids: { has: otherUserId } },
        ],
      },
    });

    if (!conversation) return res.json({ messages: [], conversation_status: null });

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversation.id },
      include: { sender: { select: USER_SELECT }, recipient: { select: USER_SELECT } },
      orderBy: { created_at: 'asc' },
    });

    await prisma.message.updateMany({
      where: { conversation_id: conversation.id, recipient_id: currentUserId, read: false },
      data: { read: true },
    });

    res.json({ messages, conversation_status: conversation.status });
  } catch (err) {
    console.error('conversation error:', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', requireAuth, async (req, res) => {
  try {
    const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
    if (!message) return res.status(404).json({ error: 'Not found' });
    if (message.sender_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await prisma.message.delete({ where: { id: req.params.messageId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
