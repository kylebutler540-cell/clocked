const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { generateUniqueAnonNumber } = require('../lib/anonNumber');
const { notify } = require('../lib/notify');
const { sendReportEmail } = require('../lib/mailer');

const router = express.Router();

const PAGE_SIZE = 20;

const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.ogv'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.avif', '.bmp'];

function isVideoUrl(url) {
  const lower = url.toLowerCase().split('?')[0];
  return VIDEO_EXTS.some(ext => lower.endsWith(ext));
}

function isImageUrl(url) {
  const lower = url.toLowerCase().split('?')[0];
  return IMAGE_EXTS.some(ext => lower.endsWith(ext));
}

// Get feed (paginated, most recent first)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { cursor, employer_place_id, rating, search, sort, location, userId } = req.query;
    const isTopRated = sort === 'top';

    const where = {};
    if (employer_place_id) where.employer_place_id = employer_place_id;
    if (userId) where.anonymous_user_id = userId;
    if (rating && ['BAD', 'NEUTRAL', 'GOOD'].includes(rating)) {
      where.rating_emoji = rating;
    }
    if (search) {
      where.OR = [
        { employer_name: { contains: search, mode: 'insensitive' } },
        { header: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (location) {
      const locationFilter = { employer_address: { contains: location, mode: 'insensitive' } };
      if (where.OR) {
        where.AND = [{ OR: where.OR }, locationFilter];
        delete where.OR;
      } else {
        Object.assign(where, locationFilter);
      }
    }
    // Top rated: only posts with at least 1 like
    if (isTopRated) {
      where.likes = { gte: 1 };
    }

    const orderBy = isTopRated
      ? [{ likes: 'desc' }, { created_at: 'desc' }]
      : { created_at: 'desc' };

    const posts = await prisma.post.findMany({
      where,
      orderBy,
      take: PAGE_SIZE + 1,
      ...(cursor && !isTopRated ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
        _count: { select: { comments: true } },
      },
    });

    // Sort top rated by net score (likes - dislikes) in memory
    if (isTopRated) {
      posts.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
    }

    let nextCursor = null;
    if (posts.length > PAGE_SIZE) {
      nextCursor = posts[PAGE_SIZE].id;
      posts.pop();
    }

    // Get saves and reactions for current user
    let savedPostIds = new Set();
    let likedPostIds = new Set();
    let dislikedPostIds = new Set();
    if (req.user) {
      const postIds = posts.map(p => p.id);
      const [saves, reactions] = await Promise.all([
        prisma.save.findMany({
          where: { user_id: req.user.id, post_id: { in: postIds } },
          select: { post_id: true },
        }),
        prisma.postReaction.findMany({
          where: { user_id: req.user.id, post_id: { in: postIds } },
          select: { post_id: true, type: true },
        }),
      ]);
      savedPostIds = new Set(saves.map(s => s.post_id));
      reactions.forEach(r => {
        if (r.type === 'like') likedPostIds.add(r.post_id);
        else dislikedPostIds.add(r.post_id);
      });
    }

    const isSubscribed = req.user && ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);

    const formatted = posts.map(post => formatPost(post, savedPostIds, isSubscribed, likedPostIds, dislikedPostIds));

    res.json({ posts: formatted, nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// IMPORTANT: All /user/* routes must come before /:id to avoid the param catching them

// Get top-rated employers leaderboard (location-filtered)
router.get("/employer-leaderboard", optionalAuth, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const { location } = req.query;

    // Haversine distance in miles
    function haversineMiles(lat1, lon1, lat2, lon2) {
      const R = 3958.8;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
      return R * 2 * Math.asin(Math.sqrt(a));
    }

    // In-memory geocode cache keyed by string
    if (!global._geocodeCache) global._geocodeCache = new Map();

    async function geocode(address) {
      if (global._geocodeCache.has(address)) return global._geocodeCache.get(address);
      try {
        const axios = require("axios");
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        const r = await axios.get(url, { timeout: 4000 });
        const result = r.data?.results?.[0]?.geometry?.location;
        if (!result) { global._geocodeCache.set(address, null); return null; }
        const coords = { lat: result.lat, lng: result.lng };
        global._geocodeCache.set(address, coords);
        return coords;
      } catch { global._geocodeCache.set(address, null); return null; }
    }

    // Fetch posts (for emoji tallies) + explicit star ratings (for avg + count)
    const [posts, starRatings] = await Promise.all([
      prisma.post.findMany({
        select: { employer_place_id: true, employer_name: true, employer_address: true, rating_emoji: true, likes: true },
      }),
      prisma.companyRating.findMany({
        select: { place_id: true, rating: true },
      }),
    ]);

    // Build star rating map: place_id → { sum, count }
    const starMap = new Map();
    starRatings.forEach(r => {
      if (!starMap.has(r.place_id)) starMap.set(r.place_id, { sum: 0, count: 0 });
      const s = starMap.get(r.place_id);
      s.sum += r.rating;
      s.count += 1;
    });

    // Group posts by employer (for emoji tallies only)
    const employerMap = new Map();
    posts.forEach(post => {
      if (!employerMap.has(post.employer_place_id)) {
        employerMap.set(post.employer_place_id, {
          employer_place_id: post.employer_place_id,
          employer_name: post.employer_name,
          employer_address: post.employer_address,
          reviews: [],
          total_likes: 0,
        });
      }
      const emp = employerMap.get(post.employer_place_id);
      emp.reviews.push(post.rating_emoji);
      emp.total_likes += (post.likes || 0);
    });

    let employers = Array.from(employerMap.values())
      .map(emp => {
        const reviews = emp.reviews;
        const good_count = reviews.filter(r => r === "GOOD").length;
        const neutral_count = reviews.filter(r => r === "NEUTRAL").length;
        const bad_count = reviews.filter(r => r === "BAD").length;

        // Star rating: only from explicit star taps (company_ratings table)
        const stars = starMap.get(emp.employer_place_id);
        const star_rating_count = stars?.count || 0;
        const avg_rating = stars && stars.count > 0
          ? Math.round((stars.sum / stars.count) * 10) / 10
          : null;

        return {
          employer_place_id: emp.employer_place_id,
          employer_name: emp.employer_name,
          employer_address: emp.employer_address,
          avg_rating,
          star_rating_count, // only explicit star taps
          review_count: reviews.length, // total posts (for emoji tally)
          good_count,
          neutral_count,
          bad_count,
          total_likes: emp.total_likes,
        };
      })
      .filter(emp => emp.review_count >= 1);

    if (location) {
      const centerCoords = await geocode(location);
      if (centerCoords) {
        // Geocode each employer (parallel, capped at 10 simultaneous)
        const withCoords = await Promise.all(
          employers.map(async emp => {
            const coords = await geocode(emp.employer_address);
            if (!coords) return null;
            const dist = haversineMiles(centerCoords.lat, centerCoords.lng, coords.lat, coords.lng);
            return { ...emp, distance_miles: Math.round(dist * 10) / 10, _dist: dist };
          })
        );
        employers = withCoords
          .filter(e => e && e._dist <= 30)
          .sort((a, b) => {
            // Star rating primary (nulls last), then upvotes, then distance
            if (b.avg_rating === null && a.avg_rating === null) return b.total_likes - a.total_likes;
            if (b.avg_rating === null) return -1;
            if (a.avg_rating === null) return 1;
            if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
            if (b.total_likes !== a.total_likes) return b.total_likes - a.total_likes;
            return a._dist - b._dist;
          })
          .map(({ _dist, ...rest }) => rest);
      } else {
        employers = employers
          .filter(e => e.employer_address.toLowerCase().includes(location.toLowerCase()))
          .sort((a, b) => {
            if (b.avg_rating === null && a.avg_rating === null) return b.total_likes - a.total_likes;
            if (b.avg_rating === null) return -1;
            if (a.avg_rating === null) return 1;
            return b.avg_rating !== a.avg_rating ? b.avg_rating - a.avg_rating : b.total_likes - a.total_likes;
          });
      }
    } else {
      employers = employers.sort((a, b) => {
        if (b.avg_rating === null && a.avg_rating === null) return b.total_likes - a.total_likes;
        if (b.avg_rating === null) return -1;
        if (a.avg_rating === null) return 1;
        return b.avg_rating !== a.avg_rating ? b.avg_rating - a.avg_rating : b.total_likes - a.total_likes;
      });
    }

    const top = employers.slice(0, 50);
    const placeIds = top.map(e => e.employer_place_id);
    const logoRows = placeIds.length
      ? await prisma.employerLogo.findMany({ where: { place_id: { in: placeIds } } })
      : [];
    const logoByPlace = Object.fromEntries(logoRows.map(r => [r.place_id, r]));

    res.json(top.map(e => ({
      ...e,
      logo_url: logoByPlace[e.employer_place_id]?.logo_url ?? null,
      domain: logoByPlace[e.employer_place_id]?.domain ?? null,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch top employers" });
  }
});

// Get posts by current user (own profile)
router.get('/user/posts', requireAuth, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { anonymous_user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
        _count: { select: { comments: true } },
      },
    });

    const isSubscribed = ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);
    const postIds = posts.map(p => p.id);
    const [saves, reactions] = await Promise.all([
      prisma.save.findMany({
        where: { user_id: req.user.id, post_id: { in: postIds } },
        select: { post_id: true },
      }),
      prisma.postReaction.findMany({
        where: { user_id: req.user.id, post_id: { in: postIds } },
        select: { post_id: true, type: true },
      }),
    ]);
    const savedIds = new Set(saves.map(s => s.post_id));
    const likedIds = new Set(reactions.filter(r => r.type === 'like').map(r => r.post_id));
    const dislikedIds = new Set(reactions.filter(r => r.type === 'dislike').map(r => r.post_id));

    res.json(posts.map(p => formatPost(p, savedIds, isSubscribed, likedIds, dislikedIds)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get posts by a specific public user (public profile)
router.get('/user/:userId/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { anonymous_user_id: req.params.userId },
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
        _count: { select: { comments: true } },
      },
    });

    res.json(posts.map(p => formatPost(p, new Set(), false)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get comment history for current user
router.get('/user/comments', requireAuth, async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { anonymous_user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
        post: { select: { id: true, employer_name: true, header: true } },
      },
    });
    res.json(comments.map(c => ({
      id: c.id,
      post_id: c.post_id,
      post_employer_name: c.post?.employer_name ?? null,
      post_header: c.post?.header ?? null,
      anonymous_user_id: c.anonymous_user_id,
      author_anon_number: c.user?.anon_number ?? null,
      body: c.body,
      created_at: c.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get posts liked by current user
router.get('/user/liked', requireAuth, async (req, res) => {
  try {
    const reactions = await prisma.postReaction.findMany({
      where: { user_id: req.user.id, type: 'like' },
      include: {
        post: {
          include: {
            user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
            _count: { select: { comments: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const isSubscribed = ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);
    const postIds = reactions.map(r => r.post_id);
    const saves = await prisma.save.findMany({
      where: { user_id: req.user.id, post_id: { in: postIds } },
      select: { post_id: true },
    });
    const savedIds = new Set(saves.map(s => s.post_id));
    const likedIds = new Set(postIds);

    res.json(reactions.map(r => formatPost(r.post, savedIds, isSubscribed, likedIds, new Set())));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch liked posts' });
  }
});

// Get posts disliked by current user
router.get('/user/disliked', requireAuth, async (req, res) => {
  try {
    const reactions = await prisma.postReaction.findMany({
      where: { user_id: req.user.id, type: 'dislike' },
      include: {
        post: {
          include: {
            user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
            _count: { select: { comments: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const isSubscribed = ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);
    const postIds = reactions.map(r => r.post_id);
    const saves = await prisma.save.findMany({
      where: { user_id: req.user.id, post_id: { in: postIds } },
      select: { post_id: true },
    });
    const savedIds = new Set(saves.map(s => s.post_id));
    const dislikedIds = new Set(postIds);

    res.json(reactions.map(r => formatPost(r.post, savedIds, isSubscribed, new Set(), dislikedIds)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch disliked posts' });
  }
});

// Get saved posts for current user
router.get('/user/saved', requireAuth, async (req, res) => {
  try {
    const saves = await prisma.save.findMany({
      where: { user_id: req.user.id },
      include: {
        post: {
          include: {
            user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
            _count: { select: { comments: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const isSubscribed = ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);
    const savedIds = new Set(saves.map(s => s.post_id));
    const postIds = saves.map(s => s.post_id);
    const reactions = await prisma.postReaction.findMany({
      where: { user_id: req.user.id, post_id: { in: postIds } },
      select: { post_id: true, type: true },
    });
    const likedIds = new Set(reactions.filter(r => r.type === 'like').map(r => r.post_id));
    const dislikedIds = new Set(reactions.filter(r => r.type === 'dislike').map(r => r.post_id));
    res.json(saves.map(s => formatPost(s.post, savedIds, isSubscribed, likedIds, dislikedIds)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch saved posts' });
  }
});

// Get video posts for current user
router.get('/user/videos', requireAuth, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { anonymous_user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
        _count: { select: { comments: true } },
      },
    });

    const videoPosts = posts.filter(p =>
      p.media_urls.length > 0 && p.media_urls.some(url => isVideoUrl(url))
    );

    const isSubscribed = ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);
    const postIds = videoPosts.map(p => p.id);
    const saves = await prisma.save.findMany({
      where: { user_id: req.user.id, post_id: { in: postIds } },
      select: { post_id: true },
    });
    const reactions = await prisma.postReaction.findMany({
      where: { user_id: req.user.id, post_id: { in: postIds } },
      select: { post_id: true, type: true },
    });
    const savedIds = new Set(saves.map(s => s.post_id));
    const likedIds = new Set(reactions.filter(r => r.type === 'like').map(r => r.post_id));
    const dislikedIds = new Set(reactions.filter(r => r.type === 'dislike').map(r => r.post_id));

    res.json(videoPosts.map(p => formatPost(p, savedIds, isSubscribed, likedIds, dislikedIds)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch video posts' });
  }
});

// Get photo posts for current user
router.get('/user/photos', requireAuth, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { anonymous_user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
        _count: { select: { comments: true } },
      },
    });

    const photoPosts = posts.filter(p =>
      p.media_urls.length > 0 && p.media_urls.some(url => !isVideoUrl(url) && (isImageUrl(url) || !url.match(/\.[a-z0-9]+(\?|$)/i)))
    );

    const isSubscribed = ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);
    const postIds = photoPosts.map(p => p.id);
    const saves = await prisma.save.findMany({
      where: { user_id: req.user.id, post_id: { in: postIds } },
      select: { post_id: true },
    });
    const reactions = await prisma.postReaction.findMany({
      where: { user_id: req.user.id, post_id: { in: postIds } },
      select: { post_id: true, type: true },
    });
    const savedIds = new Set(saves.map(s => s.post_id));
    const likedIds = new Set(reactions.filter(r => r.type === 'like').map(r => r.post_id));
    const dislikedIds = new Set(reactions.filter(r => r.type === 'dislike').map(r => r.post_id));

    res.json(photoPosts.map(p => formatPost(p, savedIds, isSubscribed, likedIds, dislikedIds)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch photo posts' });
  }
});

// Get single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let savedPostIds = new Set();
    let likedPostIds = new Set();
    let dislikedPostIds = new Set();
    if (req.user) {
      const [save, reaction] = await Promise.all([
        prisma.save.findUnique({
          where: { user_id_post_id: { user_id: req.user.id, post_id: post.id } },
        }),
        prisma.postReaction.findUnique({
          where: { user_id_post_id: { user_id: req.user.id, post_id: post.id } },
        }),
      ]);
      if (save) savedPostIds.add(post.id);
      if (reaction?.type === 'like') likedPostIds.add(post.id);
      else if (reaction?.type === 'dislike') dislikedPostIds.add(post.id);
    }

    const isSubscribed = req.user && ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);
    res.json(formatPost(post, savedPostIds, isSubscribed, likedPostIds, dislikedPostIds));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Create post (anonymous or authenticated)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { employer_place_id, employer_name, employer_address, rating_emoji, header, body, media_urls } = req.body;

    if (!employer_place_id || !employer_name || !employer_address) {
      return res.status(400).json({ error: 'Employer information required' });
    }
    if (!rating_emoji || !['BAD', 'NEUTRAL', 'GOOD'].includes(rating_emoji)) {
      return res.status(400).json({ error: 'Valid rating required (BAD, NEUTRAL, GOOD)' });
    }
    if (!header || !header.trim()) {
      return res.status(400).json({ error: 'Headline is required' });
    }
    if (body && body.trim().length > 0 && body.trim().length < 10) {
      return res.status(400).json({ error: 'Review body must be at least 10 characters' });
    }
    if (body && body.length > 5000) {
      return res.status(400).json({ error: 'Review body too long (max 5000 chars)' });
    }

    let userId = req.user?.id;
    if (!userId) {
      // Create ephemeral anonymous user with permanent anon number
      const anonNum = await generateUniqueAnonNumber();
      const anonUser = await prisma.user.create({
        data: { anonymous_id: uuidv4(), anon_number: anonNum },
      });
      userId = anonUser.id;
    }

    const post = await prisma.post.create({
      data: {
        anonymous_user_id: userId,
        employer_place_id,
        employer_name,
        employer_address,
        rating_emoji,
        header: header?.trim() || null,
        body: body?.trim() || '',
        media_urls: Array.isArray(media_urls) ? media_urls.slice(0, 10) : [],
      },
      include: {
        user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
        _count: { select: { comments: true } },
      },
    });

    // Auto-create/update star rating from emoji: GOOD=5, NEUTRAL=3, BAD=1
    const emojiToStar = { GOOD: 5, NEUTRAL: 3, BAD: 1 };
    const starValue = emojiToStar[rating_emoji];
    if (starValue) {
      await prisma.companyRating.upsert({
        where: { user_id_place_id: { user_id: userId, place_id: employer_place_id } },
        update: { rating: starValue },
        create: { user_id: userId, place_id: employer_place_id, rating: starValue },
      });
    }

    res.status(201).json(formatPost(post, new Set(), true));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Like a post (toggle, one per user)
router.post('/:id/like', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login to like posts' });

    const existing = await prisma.postReaction.findUnique({
      where: { user_id_post_id: { user_id: userId, post_id: req.params.id } },
    });

    if (existing?.type === 'like') {
      // Unlike
      await prisma.postReaction.delete({ where: { id: existing.id } });
      const post = await prisma.post.update({ where: { id: req.params.id }, data: { likes: { decrement: 1 } }, select: { likes: true, dislikes: true } });
      return res.json({ ...post, liked: false, disliked: false });
    }

    if (existing?.type === 'dislike') {
      // Switch from dislike to like
      await prisma.postReaction.update({ where: { id: existing.id }, data: { type: 'like' } });
      const post = await prisma.post.update({ where: { id: req.params.id }, data: { likes: { increment: 1 }, dislikes: { decrement: 1 } }, select: { likes: true, dislikes: true } });
      return res.json({ ...post, liked: true, disliked: false });
    }

    // New like
    await prisma.postReaction.create({ data: { user_id: userId, post_id: req.params.id, type: 'like' } });
    const [post, actor] = await Promise.all([
      prisma.post.update({ where: { id: req.params.id }, data: { likes: { increment: 1 } }, select: { likes: true, dislikes: true, anonymous_user_id: true, header: true, media_urls: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, display_name: true, avatar_url: true, anon_number: true } }),
    ]);
    // Notify post owner (not self)
    if (post.anonymous_user_id && post.anonymous_user_id !== userId) {
      const postImage = Array.isArray(post.media_urls) ? post.media_urls[0] || null : null;
      await notify({ userId: post.anonymous_user_id, type: 'like', message: `${actor?.display_name || 'Someone'} liked your post.`, data: { post_id: req.params.id, post_header: post.header, post_image: postImage, actor_id: userId, actor_name: actor?.display_name || null, actor_avatar: actor?.avatar_url || null } });
    }
    res.json({ likes: post.likes, dislikes: post.dislikes, liked: true, disliked: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Dislike a post (toggle, one per user)
router.post('/:id/dislike', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login to dislike posts' });

    const existing = await prisma.postReaction.findUnique({
      where: { user_id_post_id: { user_id: userId, post_id: req.params.id } },
    });

    if (existing?.type === 'dislike') {
      // Un-dislike
      await prisma.postReaction.delete({ where: { id: existing.id } });
      const post = await prisma.post.update({ where: { id: req.params.id }, data: { dislikes: { decrement: 1 } }, select: { likes: true, dislikes: true } });
      return res.json({ ...post, liked: false, disliked: false });
    }

    if (existing?.type === 'like') {
      // Switch from like to dislike
      await prisma.postReaction.update({ where: { id: existing.id }, data: { type: 'dislike' } });
      const post = await prisma.post.update({ where: { id: req.params.id }, data: { dislikes: { increment: 1 }, likes: { decrement: 1 } }, select: { likes: true, dislikes: true } });
      return res.json({ ...post, liked: false, disliked: true });
    }

    // New dislike
    await prisma.postReaction.create({ data: { user_id: userId, post_id: req.params.id, type: 'dislike' } });
    const [post, actor] = await Promise.all([
      prisma.post.update({ where: { id: req.params.id }, data: { dislikes: { increment: 1 } }, select: { likes: true, dislikes: true, anonymous_user_id: true, header: true, media_urls: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, display_name: true, avatar_url: true } }),
    ]);
    // Notify post owner (not self)
    if (post.anonymous_user_id && post.anonymous_user_id !== userId) {
      const postImage = Array.isArray(post.media_urls) ? post.media_urls[0] || null : null;
      await notify({ userId: post.anonymous_user_id, type: 'dislike', message: `${actor?.display_name || 'Someone'} disliked your post.`, data: { post_id: req.params.id, post_header: post.header, post_image: postImage, actor_id: userId, actor_name: actor?.display_name || null, actor_avatar: actor?.avatar_url || null } });
    }
    res.json({ likes: post.likes, dislikes: post.dislikes, liked: false, disliked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to dislike post' });
  }
});

// Save a post (requires auth)
router.post('/:id/save', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.save.findUnique({
      where: { user_id_post_id: { user_id: req.user.id, post_id: req.params.id } },
    });

    if (existing) {
      await prisma.save.delete({ where: { id: existing.id } });
      res.json({ saved: false });
    } else {
      await prisma.save.create({ data: { user_id: req.user.id, post_id: req.params.id } });
      res.json({ saved: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// Flag a post
router.post('/:id/flag', optionalAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    let userId = req.user?.id;
    if (!userId) {
      const anonNum = await generateUniqueAnonNumber();
      const anonUser = await prisma.user.create({ data: { anonymous_id: uuidv4(), anon_number: anonNum } });
      userId = anonUser.id;
    }

    await prisma.flag.upsert({
      where: { user_id_post_id: { user_id: userId, post_id: req.params.id } },
      update: { reason },
      create: { user_id: userId, post_id: req.params.id, reason },
    });

    // Fire report email (non-blocking — don't fail the request if email fails)
    console.log('[flag] post flagged, firing email for post:', req.params.id, 'reason:', reason);
    prisma.post.findUnique({
      where: { id: req.params.id },
      select: { body: true, employer_name: true, anonymous_user_id: true },
    }).then(post => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, anon_number: true },
      }).then(reporter => {
        const reporterHandle = reporter?.username
          ? `@${reporter.username}`
          : reporter?.anon_number
          ? `Anon #${reporter.anon_number}`
          : 'Unknown';
        return sendReportEmail({
          reporterHandle,
          reason,
          postId: req.params.id,
          postEmployer: post?.employer_name,
          postBody: post?.body,
          timestamp: new Date(),
        });
      });
    }).catch(err => console.error('[report email]', err));

    res.json({ flagged: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to flag post' });
  }
});

// Edit post (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { body, header, rating_emoji, media_urls, employer_place_id, employer_name, employer_address } = req.body;
    if (!body || body.trim().length < 10) {
      return res.status(400).json({ error: 'Review body must be at least 10 characters' });
    }
    if (body.length > 5000) {
      return res.status(400).json({ error: 'Review body too long (max 5000 chars)' });
    }
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.anonymous_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updateData = { body: body.trim() };
    if (header) updateData.header = header.trim();
    if (rating_emoji) updateData.rating_emoji = rating_emoji;
    if (Array.isArray(media_urls)) updateData.media_urls = media_urls.slice(0, 10);
    if (employer_place_id) updateData.employer_place_id = employer_place_id;
    if (employer_name) updateData.employer_name = employer_name;
    if (employer_address !== undefined) updateData.employer_address = employer_address;
    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        user: { select: { anon_number: true, display_name: true, username: true, avatar_url: true } },
        _count: { select: { comments: true } },
      },
    });
    res.json(formatPost(updated, new Set(), true));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete post (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.anonymous_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await prisma.comment.deleteMany({ where: { post_id: req.params.id } });
    await prisma.postReaction.deleteMany({ where: { post_id: req.params.id } });
    await prisma.save.deleteMany({ where: { post_id: req.params.id } });
    await prisma.flag.deleteMany({ where: { post_id: req.params.id } });
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

const { matchBrandMap, logoUrlFromDomain, batchGetLogoUrls } = require('../lib/brandLogo');

function employerLogoUrl(name, placeId) {
  if (!name) return null;
  // Use brand map first (instant, no async needed for known brands)
  const domain = matchBrandMap(name);
  if (domain) return logoUrlFromDomain(domain);
  // Fallback: normalize name to domain guess
  const cleaned = name
    .toLowerCase()
    .replace(/#\d+/g, '')
    .replace(/\b(supercenter|distribution center|distribution|warehouse|center|store|stores|location|inc|llc|ltd|corp|co|company|restaurant|cafe|grill|bar|club)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  if (!cleaned || cleaned.length < 3) return null;
  return logoUrlFromDomain(`${cleaned}.com`);
}

function formatPost(post, savedPostIds, isSubscribed, likedPostIds = new Set(), dislikedPostIds = new Set()) {
  const body = post.body;

  return {
    id: post.id,
    anonymous_user_id: post.anonymous_user_id,
    author_anon_number: post.user?.anon_number ?? null,
    author_display_name: post.user?.display_name ?? null,
    author_username: post.user?.username ?? null,
    author_avatar_url: post.user?.avatar_url ?? null,
    employer_place_id: post.employer_place_id,
    employer_name: post.employer_name,
    employer_address: post.employer_address,
    employer_logo_url: employerLogoUrl(post.employer_name, post.employer_place_id),
    rating_emoji: post.rating_emoji,
    header: post.header,
    body: body,
    body_truncated: false,
    media_urls: post.media_urls,
    likes: post.likes,
    dislikes: post.dislikes,
    liked: likedPostIds.has(post.id),
    disliked: dislikedPostIds.has(post.id),
    comment_count: post._count?.comments ?? 0,
    saved: savedPostIds.has(post.id),
    created_at: post.created_at,
    updated_at: post.updated_at,
  };
}

module.exports = router;
