const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const USER_SELECT = { id: true, display_name: true, username: true, avatar_url: true };

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
    data: { participant_ids: [userA, userB] },
  });
}

// POST /api/messages/:recipientId
router.post('/:recipientId', requireAuth, async (req, res) => {
  try {
    const { body, image_url } = req.body;
    const recipientId = req.params.recipientId;
    const senderId = req.user.id;

    if (!body?.trim() && !image_url) return res.status(400).json({ error: 'Empty message' });
    if (senderId === recipientId) return res.status(400).json({ error: 'Cannot message yourself' });

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) return res.status(404).json({ error: 'User not found' });

    const conversation = await getOrCreateConversation(senderId, recipientId);

    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        sender_id: senderId,
        recipient_id: recipientId,
        body: body?.trim() || (image_url ? '📷 Photo' : ''),
        status: 'sent',
      },
      include: { sender: { select: USER_SELECT }, recipient: { select: USER_SELECT } },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        last_message: body.trim(),
        last_message_at: message.created_at,
        last_message_sender: senderId,
      },
    });

    const io = req.app.get('io');
    if (io) {
      const payload = { ...message, conversation_id: conversation.id };
      io.to(`user:${recipientId}`).emit('new_message', payload);
      io.to(`user:${senderId}`).emit('message_sent', payload);
    }

    res.status(201).json({ ...message, conversation_id: conversation.id });
  } catch (err) {
    console.error('send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/inbox
router.get('/inbox', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await prisma.conversation.findMany({
      where: { participant_ids: { has: userId } },
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

    if (!conversation) return res.json([]);

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversation.id },
      include: { sender: { select: USER_SELECT }, recipient: { select: USER_SELECT } },
      orderBy: { created_at: 'asc' },
    });

    await prisma.message.updateMany({
      where: { conversation_id: conversation.id, recipient_id: currentUserId, read: false },
      data: { read: true },
    });

    res.json(messages);
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
