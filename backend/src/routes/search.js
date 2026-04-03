const express = require('express');
const prisma = require('../lib/prisma');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Strip brand suffixes to get a clean domain slug for logo lookup
function getBrandDomain(name) {
  if (!name) return null;
  const stopWords = /\b(supercenter|superstore|super|store|market|supermarket|center|centre|depot|warehouse|express|neighborhood|garden|pharmacy|optical|gas|station|bakery|deli|cafe|restaurant|grill|bar|pub|inn|hotel|motel|suites|lodge|clinic|hospital|medical|dental|office|headquarters|corporate|co\.|inc\.|llc|ltd|group|holdings|corp|services|solutions)\b/gi;
  const brand = name.replace(stopWords, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)[0];
  return brand ? `${brand.toLowerCase()}.com` : null;
}

// Global search: companies (from our DB) + posts + users
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ companies: [], posts: [], users: [] });

    const term = q.trim();

    const [companies, posts, users] = await Promise.all([
      // Companies: match employer name in posts table (distinct by place_id)
      prisma.post.findMany({
        where: {
          employer_name: { contains: term, mode: 'insensitive' },
          employer_place_id: { not: null },
        },
        select: {
          employer_place_id: true,
          employer_name: true,
          employer_address: true,
        },
        distinct: ['employer_place_id'],
        take: 5,
      }),

      // Posts: match header or body text
      prisma.post.findMany({
        where: {
          OR: [
            { header: { contains: term, mode: 'insensitive' } },
            { body: { contains: term, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ likes: 'desc' }, { created_at: 'desc' }],
        take: 5,
        select: {
          id: true,
          header: true,
          body: true,
          rating_emoji: true,
          employer_name: true,
          employer_place_id: true,
          created_at: true,
          likes: true,
          anonymous_user_id: true,
          user: { select: { display_name: true, username: true, avatar_url: true, anon_number: true } },
        },
      }),

      // Users: match display_name or username
      prisma.user.findMany({
        where: {
          OR: [
            { display_name: { contains: term, mode: 'insensitive' } },
            { username: { contains: term, mode: 'insensitive' } },
          ],
          username: { not: null }, // only users with a profile
        },
        take: 5,
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          anon_number: true,
          follower_count: true,
        },
      }),
    ]);

    res.json({
      companies: companies.map(c => ({
        place_id: c.employer_place_id,
        name: c.employer_name,
        address: c.employer_address,
        logo_domain: getBrandDomain(c.employer_name),
      })),
      posts: posts.map(p => ({
        id: p.id,
        header: p.header,
        body: p.body,
        rating_emoji: p.rating_emoji,
        employer_name: p.employer_name,
        employer_place_id: p.employer_place_id,
        created_at: p.created_at,
        likes: p.likes,
        anonymous_user_id: p.anonymous_user_id,
        author_display_name: p.user?.display_name ?? null,
        author_username: p.user?.username ?? null,
        author_avatar_url: p.user?.avatar_url ?? null,
        author_anon_number: p.user?.anon_number ?? null,
      })),
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        anon_number: u.anon_number,
        follower_count: u.follower_count,
      })),
    });
  } catch (err) {
    console.error('Global search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
