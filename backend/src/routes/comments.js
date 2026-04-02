const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { generateUniqueAnonNumber } = require('../lib/anonNumber');
const { notify } = require('../lib/notify');

const router = express.Router({ mergeParams: true });

function formatComment(c, currentUserId) {
  const liked = currentUserId
    ? (c.likes_rel || []).some(l => l.user_id === currentUserId)
    : false;
  return {
    id: c.id,
    post_id: c.post_id,
    anonymous_user_id: c.anonymous_user_id,
    author_anon_number: c.user?.anon_number ?? null,
    author_display_name: c.user?.display_name ?? null,
    author_avatar_url: c.user?.avatar_url ?? null,
    body: c.body,
    image_url: c.image_url ?? null,
    parent_id: c.parent_id ?? null,
    likes: c.likes,
    liked,
    created_at: c.created_at,
  };
}

// Get comments for a post (top-level with nested replies)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const currentUserId = req.user?.id ?? null;

    const allComments = await prisma.comment.findMany({
      where: { post_id: req.params.postId },
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { anon_number: true, display_name: true, avatar_url: true } },
        likes_rel: currentUserId ? { where: { user_id: currentUserId }, select: { user_id: true } } : false,
      },
    });

    // Build a map for quick lookup
    const byId = {};
    allComments.forEach(c => { byId[c.id] = formatComment(c, currentUserId); });

    // Attach replies to parents
    const topLevel = [];
    allComments.forEach(c => {
      if (c.parent_id && byId[c.parent_id]) {
        if (!byId[c.parent_id].replies) byId[c.parent_id].replies = [];
        byId[c.parent_id].replies.push(byId[c.id]);
      } else {
        topLevel.push(byId[c.id]);
      }
    });

    res.json(topLevel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add comment (anonymous or authenticated)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { body, image_url, parent_id } = req.body;
    if ((!body || body.trim().length < 1) && !image_url) {
      return res.status(400).json({ error: 'Comment must have text or an image' });
    }
    if (body && body.length > 1600) {
      return res.status(400).json({ error: 'Comment too long (max 1600 chars)' });
    }

    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Validate parent comment if provided
    let parentComment = null;
    if (parent_id) {
      parentComment = await prisma.comment.findUnique({ where: { id: parent_id } });
      if (!parentComment || parentComment.post_id !== req.params.postId) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
    }

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
        body: body?.trim() || '',
        image_url: image_url || null,
        parent_id: parent_id || null,
      },
      include: { user: { select: { anon_number: true, display_name: true, avatar_url: true } } },
    });

    const result = {
      id: comment.id,
      post_id: comment.post_id,
      anonymous_user_id: comment.anonymous_user_id,
      author_anon_number: comment.user?.anon_number ?? null,
      author_display_name: comment.user?.display_name ?? null,
      author_avatar_url: comment.user?.avatar_url ?? null,
      body: comment.body,
      image_url: comment.image_url ?? null,
      parent_id: comment.parent_id ?? null,
      likes: 0,
      liked: false,
      replies: [],
      created_at: comment.created_at,
    };

    // Notify post owner of new comment (not self)
    if (post.anonymous_user_id && post.anonymous_user_id !== userId && !parent_id) {
      await notify({
        userId: post.anonymous_user_id,
        type: 'comment',
        message: 'Someone commented on your post.',
        data: { post_id: post.id, comment_id: comment.id },
      });
    }

    // Notify parent comment owner of reply (not self)
    if (parentComment && parentComment.anonymous_user_id !== userId) {
      await notify({
        userId: parentComment.anonymous_user_id,
        type: 'reply',
        message: 'Someone replied to your comment.',
        data: { post_id: post.id, comment_id: comment.id, parent_id: parent_id },
      });
    }

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Toggle like on a comment
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const existing = await prisma.commentLike.findUnique({
      where: { user_id_comment_id: { user_id: req.user.id, comment_id: req.params.id } },
    });

    let liked;
    if (existing) {
      // Unlike
      await prisma.commentLike.delete({ where: { id: existing.id } });
      const updated = await prisma.comment.update({
        where: { id: req.params.id },
        data: { likes: { decrement: 1 } },
      });
      liked = false;
      return res.json({ liked, likes: Math.max(0, updated.likes) });
    } else {
      // Like
      await prisma.commentLike.create({
        data: { user_id: req.user.id, comment_id: req.params.id },
      });
      const updated = await prisma.comment.update({
        where: { id: req.params.id },
        data: { likes: { increment: 1 } },
      });
      liked = true;
      return res.json({ liked, likes: updated.likes });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle like' });
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
