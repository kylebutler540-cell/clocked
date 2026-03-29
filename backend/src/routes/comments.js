const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { generateUniqueAnonNumber } = require('../lib/anonNumber');
const { notify } = require('../lib/notify');

const router = express.Router({ mergeParams: true });

// Get comments for a post
router.get('/', async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { post_id: req.params.postId },
      orderBy: { created_at: 'asc' },
      include: { user: { select: { anon_number: true } } },
    });
    res.json(comments.map(c => ({
      id: c.id,
      post_id: c.post_id,
      anonymous_user_id: c.anonymous_user_id,
      author_anon_number: c.user?.anon_number ?? null,
      body: c.body,
      image_url: c.image_url ?? null,
      created_at: c.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add comment (anonymous or authenticated)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { body, image_url } = req.body;
    if (!body || body.trim().length < 1) {
      return res.status(400).json({ error: 'Comment body required' });
    }
    if (body.length > 1000) {
      return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });
    }

    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let userId = req.user?.id;
    if (!userId) {
      const anonNum = await generateUniqueAnonNumber();
      const anonUser = await prisma.user.create({ data: { anonymous_id: uuidv4(), anon_number: anonNum } });
      userId = anonUser.id;
    }

    const comment = await prisma.comment.create({
      data: {
        post_id: req.params.postId,
        anonymous_user_id: userId,
        body: body.trim(),
        image_url: image_url || null,
      },
      include: { user: { select: { anon_number: true } } },
    });

    const result = {
      id: comment.id,
      post_id: comment.post_id,
      anonymous_user_id: comment.anonymous_user_id,
      author_anon_number: comment.user?.anon_number ?? null,
      body: comment.body,
      image_url: comment.image_url ?? null,
      created_at: comment.created_at,
    };

    // Notify post owner (not self)
    if (post.anonymous_user_id && post.anonymous_user_id !== userId) {
      await notify({
        userId: post.anonymous_user_id,
        type: 'comment',
        message: 'Someone commented on your post.',
        data: { post_id: post.id, comment_id: comment.id },
      });
    }

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Edit comment (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || body.trim().length < 1) {
      return res.status(400).json({ error: 'Comment body required' });
    }
    if (body.length > 1000) {
      return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });
    }
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.anonymous_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await prisma.comment.update({
      where: { id: req.params.id },
      data: { body: body.trim() },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.anonymous_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
