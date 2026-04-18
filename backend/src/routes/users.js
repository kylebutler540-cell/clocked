const express = require('express');
const prisma = require('../lib/prisma');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const USER_SELECT = {
  id: true,
  username: true,
  display_name: true,
  avatar_url: true,
  anon_number: true,
  follower_count: true,
  following_count: true,
};

// GET /api/users/search?q=<term>&cursor=<id>&limit=20
// Dedicated user-search for Find Friends — paginated, with follow state
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, cursor, limit: limitStr } = req.query;
    const limit = Math.min(parseInt(limitStr) || 20, 50);
    const currentUserId = req.user?.id;

    // Empty query → return empty (no "all users" dump on load)
    if (!q || q.trim().length < 1) return res.json({ users: [], nextCursor: null });

    const term = q.trim();

    const where = {
      OR: [
        { display_name: { contains: term, mode: 'insensitive' } },
        { username: { contains: term, mode: 'insensitive' } },
      ],
      // Exclude anonymous/incomplete accounts — must have at least a display name or username
      OR: [
        {
          OR: [
            { display_name: { contains: term, mode: 'insensitive' } },
            { username: { contains: term, mode: 'insensitive' } },
          ],
          AND: [
            {
              OR: [
                { display_name: { not: null } },
                { username: { not: null } },
              ],
            },
          ],
        },
      ],
    };

    // Simpler, correct where clause
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { display_name: { contains: term, mode: 'insensitive' } },
              { username: { contains: term, mode: 'insensitive' } },
            ],
          },
          {
            OR: [
              { display_name: { not: null } },
              { username: { not: null } },
            ],
          },
          // Exclude the searching user themselves
          ...(currentUserId ? [{ id: { not: currentUserId } }] : []),
        ],
      },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1, // fetch one extra to detect next page
      orderBy: [
        { follower_count: 'desc' },
        { created_at: 'desc' },
      ],
      select: USER_SELECT,
    });

    const hasMore = users.length > limit;
    const page = hasMore ? users.slice(0, limit) : users;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Batch follow state lookup
    let followSet = new Set();
    if (currentUserId && page.length > 0) {
      const targetIds = page.map(u => u.id);
      const follows = await prisma.follow.findMany({
        where: { follower_id: currentUserId, following_id: { in: targetIds } },
        select: { following_id: true },
      });
      followSet = new Set(follows.map(f => f.following_id));
    }

    res.json({
      users: page.map(u => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        anon_number: u.anon_number,
        follower_count: u.follower_count,
        following_count: u.following_count,
        is_following: followSet.has(u.id),
      })),
      nextCursor,
    });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'User search failed' });
  }
});

module.exports = router;
