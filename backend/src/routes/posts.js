const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { generateUniqueAnonNumber } = require('../lib/anonNumber');

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
        user: { select: { anon_number: true } },
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

// Get posts by current user (own profile)
router.get('/user/posts', requireAuth, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { anonymous_user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { anon_number: true } },
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
        user: { select: { anon_number: true } },
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
        user: { select: { anon_number: true } },
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
            user: { select: { anon_number: true } },
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
            user: { select: { anon_number: true } },
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
            user: { select: { anon_number: true } },
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
        user: { select: { anon_number: true } },
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
        user: { select: { anon_number: true } },
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
        user: { select: { anon_number: true } },
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
    if (!body || body.trim().length < 10) {
      return res.status(400).json({ error: 'Review body must be at least 10 characters' });
    }
    if (body.length > 5000) {
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
        body: body.trim(),
        media_urls: Array.isArray(media_urls) ? media_urls.slice(0, 10) : [],
      },
      include: {
        user: { select: { anon_number: true } },
        _count: { select: { comments: true } },
      },
    });

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
    const post = await prisma.post.update({ where: { id: req.params.id }, data: { likes: { increment: 1 } }, select: { likes: true, dislikes: true } });
    res.json({ ...post, liked: true, disliked: false });
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
    const post = await prisma.post.update({ where: { id: req.params.id }, data: { dislikes: { increment: 1 } }, select: { likes: true, dislikes: true } });
    res.json({ ...post, liked: false, disliked: true });
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

    res.json({ flagged: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to flag post' });
  }
});

// Edit post (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { body } = req.body;
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
    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: { body: body.trim() },
      include: {
        user: { select: { anon_number: true } },
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

function formatPost(post, savedPostIds, isSubscribed, likedPostIds = new Set(), dislikedPostIds = new Set()) {
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
    author_anon_number: post.user?.anon_number ?? null,
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
    liked: likedPostIds.has(post.id),
    disliked: dislikedPostIds.has(post.id),
    comment_count: post._count?.comments ?? 0,
    saved: savedPostIds.has(post.id),
    created_at: post.created_at,
    updated_at: post.updated_at,
  };
}

module.exports = router;
