const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const PAGE_SIZE = 20;

// Get feed (paginated, most recent first)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { cursor, employer_place_id, rating, search } = req.query;

    const where = {};
    if (employer_place_id) where.employer_place_id = employer_place_id;
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

    const posts = await prisma.post.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        _count: { select: { comments: true } },
      },
    });

    let nextCursor = null;
    if (posts.length > PAGE_SIZE) {
      nextCursor = posts[PAGE_SIZE].id;
      posts.pop();
    }

    // Get saves for current user
    let savedPostIds = new Set();
    if (req.user) {
      const saves = await prisma.save.findMany({
        where: { user_id: req.user.id, post_id: { in: posts.map(p => p.id) } },
        select: { post_id: true },
      });
      savedPostIds = new Set(saves.map(s => s.post_id));
    }

    const isSubscribed = req.user && ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);

    const formatted = posts.map(post => formatPost(post, savedPostIds, isSubscribed));

    res.json({ posts: formatted, nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { comments: true } } },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let savedPostIds = new Set();
    if (req.user) {
      const save = await prisma.save.findUnique({
        where: { user_id_post_id: { user_id: req.user.id, post_id: post.id } },
      });
      if (save) savedPostIds.add(post.id);
    }

    const isSubscribed = req.user && ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);
    res.json(formatPost(post, savedPostIds, isSubscribed));
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
    if (!body || body.trim().length < 10) {
      return res.status(400).json({ error: 'Review body must be at least 10 characters' });
    }
    if (body.length > 5000) {
      return res.status(400).json({ error: 'Review body too long (max 5000 chars)' });
    }

    let userId = req.user?.id;
    if (!userId) {
      // Create ephemeral anonymous user
      const anonUser = await prisma.user.create({
        data: { anonymous_id: uuidv4() },
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
        body: body.trim(),
        media_urls: Array.isArray(media_urls) ? media_urls.slice(0, 10) : [],
      },
      include: { _count: { select: { comments: true } } },
    });

    res.status(201).json(formatPost(post, new Set(), true));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Like a post
router.post('/:id/like', optionalAuth, async (req, res) => {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { likes: { increment: 1 } },
      select: { likes: true, dislikes: true },
    });
    res.json(post);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Post not found' });
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Dislike a post
router.post('/:id/dislike', optionalAuth, async (req, res) => {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { dislikes: { increment: 1 } },
      select: { likes: true, dislikes: true },
    });
    res.json(post);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Post not found' });
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
      const anonUser = await prisma.user.create({ data: { anonymous_id: uuidv4() } });
      userId = anonUser.id;
    }

    await prisma.flag.upsert({
      where: { user_id_post_id: { user_id: userId, post_id: req.params.id } },
      update: { reason },
      create: { user_id: userId, post_id: req.params.id, reason },
    });

    res.json({ flagged: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to flag post' });
  }
});

// Get saved posts for current user
router.get('/user/saved', requireAuth, async (req, res) => {
  try {
    const saves = await prisma.save.findMany({
      where: { user_id: req.user.id },
      include: {
        post: { include: { _count: { select: { comments: true } } } },
      },
      orderBy: { id: 'desc' },
    });

    const isSubscribed = ['ACTIVE', 'TRIALING'].includes(req.user.subscription_status);
    const savedIds = new Set(saves.map(s => s.post_id));
    res.json(saves.map(s => formatPost(s.post, savedIds, isSubscribed)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch saved posts' });
  }
});

function formatPost(post, savedPostIds, isSubscribed) {
  const body = post.body;
  let previewBody = body;
  let truncated = false;

  if (!isSubscribed) {
    // Show first 2 sentences
    const sentenceMatch = body.match(/^([^.!?]*[.!?]){1,2}/);
    if (sentenceMatch && sentenceMatch[0].length < body.length) {
      previewBody = sentenceMatch[0].trim();
      truncated = true;
    } else if (body.length > 200) {
      previewBody = body.slice(0, 200);
      truncated = true;
    }
  }

  return {
    id: post.id,
    anonymous_user_id: post.anonymous_user_id,
    employer_place_id: post.employer_place_id,
    employer_name: post.employer_name,
    employer_address: post.employer_address,
    rating_emoji: post.rating_emoji,
    header: post.header,
    body: previewBody,
    body_truncated: truncated,
    media_urls: post.media_urls,
    likes: post.likes,
    dislikes: post.dislikes,
    comment_count: post._count?.comments ?? 0,
    saved: savedPostIds.has(post.id),
    created_at: post.created_at,
    updated_at: post.updated_at,
  };
}

module.exports = router;
