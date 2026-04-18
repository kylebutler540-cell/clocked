const express = require('express');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/search?q=<term>&cursor=<offset>&limit=20
// Smart user search for Find Friends — ranked, case-insensitive, fuzzy-friendly
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, cursor, limit: limitStr } = req.query;
    const limit = Math.min(parseInt(limitStr) || 20, 50);
    const currentUserId = req.user?.id || null;

    if (!q || q.trim().length < 1) return res.json({ users: [], nextCursor: null });

    // Strip leading @ and trim
    const raw = q.trim();
    const term = raw.startsWith('@') ? raw.slice(1).trim() : raw;

    if (!term) return res.json({ users: [], nextCursor: null });

    // Use cursor as a numeric offset for raw SQL pagination
    const offset = cursor ? parseInt(cursor) || 0 : 0;
    const fetchLimit = limit + 1;

    // Ranked query:
    // score 6 → exact username match
    // score 5 → exact display_name match
    // score 4 → username starts-with
    // score 3 → display_name starts-with
    // score 2 → username contains
    // score 1 → display_name contains
    // Tie-break: follower_count desc → created_at desc
    const termLower = term.toLowerCase();
    const likePattern = `%${termLower}%`;
    const startsPattern = `${termLower}%`;

    const rows = await prisma.$queryRaw`
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.anon_number,
        u.follower_count,
        u.following_count,
        u.created_at,
        CASE
          WHEN LOWER(u.username) = ${termLower}                        THEN 6
          WHEN LOWER(u.display_name) = ${termLower}                    THEN 5
          WHEN LOWER(u.username) LIKE ${startsPattern}                 THEN 4
          WHEN LOWER(u.display_name) LIKE ${startsPattern}             THEN 3
          WHEN LOWER(u.username) LIKE ${likePattern}                   THEN 2
          WHEN LOWER(u.display_name) LIKE ${likePattern}               THEN 1
          ELSE 0
        END AS score
      FROM "users" u
      WHERE
        (u.display_name IS NOT NULL OR u.username IS NOT NULL)
        AND (
          LOWER(u.username) LIKE ${likePattern}
          OR LOWER(u.display_name) LIKE ${likePattern}
        )
        ${currentUserId ? Prisma.sql`AND u.id != ${currentUserId}` : Prisma.empty}
      ORDER BY score DESC, u.follower_count DESC, u.created_at DESC
      LIMIT ${fetchLimit}
      OFFSET ${offset}
    `;

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? String(offset + limit) : null;

    // Batch follow state
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
        follower_count: Number(u.follower_count) || 0,
        following_count: Number(u.following_count) || 0,
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
