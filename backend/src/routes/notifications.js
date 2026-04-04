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

    // 1. Batch-fetch by actor_id (new-style notifications)
    // Fetch ALL actor IDs (even ones with actor_name stored) to ensure fresh data
    const allActorIds = [
      ...new Set(
        notifications
          .filter(n => n.data?.actor_id)
          .map(n => n.data.actor_id)
      ),
    ];
    let actorMap = {};
    if (allActorIds.length > 0) {
      const actors = await prisma.user.findMany({
        where: { id: { in: allActorIds } },
        select: { id: true, display_name: true, username: true, anon_number: true, avatar_url: true },
      });
      actors.forEach(a => {
        // Best display name: display_name > username > "User #anon_number" > "A Clocked User"
        const name = a.display_name || a.username || (a.anon_number ? `User #${a.anon_number}` : null) || 'A Clocked User';
        actorMap[a.id] = { ...a, _resolved_name: name };
      });
    }

    // 2. For old comment/reply notifications with comment_id but no actor_id,
    //    look up the comment author directly
    const missingCommentIds = [
      ...new Set(
        notifications
          .filter(n =>
            (n.type === 'comment' || n.type === 'reply') &&
            n.data?.comment_id &&
            !n.data?.actor_id &&
            !n.data?.actor_name
          )
          .map(n => n.data.comment_id)
      ),
    ];
    let commentActorMap = {}; // comment_id -> { id, display_name, avatar_url }
    if (missingCommentIds.length > 0) {
      const comments = await prisma.comment.findMany({
        where: { id: { in: missingCommentIds } },
        select: {
          id: true,
          anonymous_user_id: true,
          user: { select: { id: true, display_name: true, username: true, anon_number: true, avatar_url: true } },
        },
      });
      comments.forEach(c => {
        if (c.user) {
          const name = c.user.display_name || c.user.username || (c.user.anon_number ? `User #${c.user.anon_number}` : null) || 'A Clocked User';
          commentActorMap[c.id] = { ...c.user, _resolved_name: name };
        }
      });
    }

    const enriched = notifications.map(n => {
      let data = { ...n.data };

      // Always re-enrich via actor_id (picks up name changes + fixes null display_name)
      if (data.actor_id && actorMap[data.actor_id]) {
        const a = actorMap[data.actor_id];
        data.actor_name = a._resolved_name;
        data.actor_avatar = a.avatar_url || null;
      }

      // Enrich old comment/reply notifications via comment lookup
      if (!data.actor_id && data.comment_id && commentActorMap[data.comment_id]) {
        const a = commentActorMap[data.comment_id];
        data.actor_id = a.id;
        data.actor_name = a._resolved_name;
        data.actor_avatar = a.avatar_url || null;
      }

      return { ...n, data };
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
