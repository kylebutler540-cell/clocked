const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const USER_PROFILE_SELECT = {
  id: true,
  display_name: true,
  username: true,
  avatar_url: true,
};

// POST /api/messages/:recipientId — send a message
router.post('/:recipientId', requireAuth, async (req, res) => {
  try {
    const { body } = req.body;
    const recipientId = req.params.recipientId;
    const senderId = req.user.id;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body cannot be empty' });
    }

    if (senderId === recipientId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Check recipient exists
    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        sender_id: senderId,
        recipient_id: recipientId,
        body: body.trim(),
      },
      include: {
        sender: { select: USER_PROFILE_SELECT },
        recipient: { select: USER_PROFILE_SELECT },
      },
    });

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/inbox — get inbox grouped by conversation partner
router.get('/inbox', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all distinct conversation partners (both sent and received)
    const sentMessages = await prisma.message.findMany({
      where: { sender_id: userId },
      distinct: ['recipient_id'],
      select: { recipient_id: true },
      orderBy: { created_at: 'desc' },
    });

    const receivedMessages = await prisma.message.findMany({
      where: { recipient_id: userId },
      distinct: ['sender_id'],
      select: { sender_id: true },
      orderBy: { created_at: 'desc' },
    });

    const partnerIds = new Set([
      ...sentMessages.map(m => m.recipient_id),
      ...receivedMessages.map(m => m.sender_id),
    ]);

    // For each partner, get last message and unread count
    const conversations = await Promise.all(
      Array.from(partnerIds).map(async (partnerId) => {
        // Get last message
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { sender_id: userId, recipient_id: partnerId },
              { sender_id: partnerId, recipient_id: userId },
            ],
          },
          orderBy: { created_at: 'desc' },
          include: {
            sender: { select: USER_PROFILE_SELECT },
            recipient: { select: USER_PROFILE_SELECT },
          },
        });

        // Get unread count
        const unreadCount = await prisma.message.count({
          where: {
            recipient_id: userId,
            sender_id: partnerId,
            read: false,
          },
        });

        // Check if mutual follows
        const [isMutualFollow] = await Promise.all([
          prisma.follow.findUnique({
            where: {
              follower_id_following_id: {
                follower_id: userId,
                following_id: partnerId,
              },
            },
          }),
          prisma.follow.findUnique({
            where: {
              follower_id_following_id: {
                follower_id: partnerId,
                following_id: userId,
              },
            },
          }),
        ]);

        const followerCheck = isMutualFollow;
        const followingCheck = await prisma.follow.findUnique({
          where: {
            follower_id_following_id: {
              follower_id: partnerId,
              following_id: userId,
            },
          },
        });

        const isFriend = !!followerCheck && !!followingCheck;

        // Get partner user data
        const partner = await prisma.user.findUnique({
          where: { id: partnerId },
          select: USER_PROFILE_SELECT,
        });

        return {
          user: partner,
          lastMessage,
          unread: unreadCount,
          isFriend,
        };
      })
    );

    // Sort: friends first, then requests, newest first
    conversations.sort((a, b) => {
      if (a.isFriend !== b.isFriend) {
        return a.isFriend ? -1 : 1;
      }
      return (b.lastMessage?.created_at || 0) - (a.lastMessage?.created_at || 0);
    });

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// GET /api/messages/conversation/:userId — get full conversation and mark as read
router.get('/conversation/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    if (currentUserId === otherUserId) {
      return res.status(400).json({ error: 'Cannot view conversation with yourself' });
    }

    // Get all messages in conversation
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { sender_id: currentUserId, recipient_id: otherUserId },
          { sender_id: otherUserId, recipient_id: currentUserId },
        ],
      },
      include: {
        sender: { select: USER_PROFILE_SELECT },
        recipient: { select: USER_PROFILE_SELECT },
      },
      orderBy: { created_at: 'asc' },
    });

    // Mark all received messages as read
    await prisma.message.updateMany({
      where: {
        recipient_id: currentUserId,
        sender_id: otherUserId,
        read: false,
      },
      data: { read: true },
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// DELETE /api/messages/:messageId — delete own message
router.delete('/:messageId', requireAuth, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.id;

    // Check message exists and belongs to user
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'Cannot delete message you did not send' });
    }

    await prisma.message.delete({ where: { id: messageId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
