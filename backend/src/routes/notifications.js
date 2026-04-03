const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get notifications for current user — enriches actor info if missing
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    // Collect actor_ids that are missing actor_name so we can batch-fetch them
    const missingActorIds = [
      ...new Set(
        notifications
          .filter(n => n.data?.actor_id && !n.data?.actor_name)
          .map(n => n.data.actor_id)
      ),
    ];

    let actorMap = {};
    if (missingActorIds.length > 0) {
      const actors = await prisma.user.findMany({
        where: { id: { in: missingActorIds } },
        select: { id: true, display_name: true, avatar_url: true },
      });
      actors.forEach(a => { actorMap[a.id] = a; });
    }

    const enriched = notifications.map(n => {
      if (n.data?.actor_id && !n.data?.actor_name && actorMap[n.data.actor_id]) {
        const actor = actorMap[n.data.actor_id];
        return {
          ...n,
          data: {
            ...n.data,
            actor_name: actor.display_name || null,
            actor_avatar: actor.avatar_url || null,
          },
        };
      }
      return n;
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notifications as read
router.post('/read', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    const where = { user_id: req.user.id };
    if (Array.isArray(ids) && ids.length > 0) {
      where.id = { in: ids };
    }

    await prisma.notification.updateMany({ where, data: { read: true } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

// Unread count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { user_id: req.user.id, read: false },
    });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

module.exports = router;
