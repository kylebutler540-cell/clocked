const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { notify } = require('../lib/notify');

const router = express.Router();

const USER_PROFILE_SELECT = {
  id: true,
  display_name: true,
  username: true,
  avatar_url: true,
  follower_count: true,
  following_count: true,
  anon_number: true,
};

// Check if current user is following a user
router.get('/:userId/is-following', requireAuth, async (req, res) => {
  try {
    const follow = await prisma.follow.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: req.user.id,
          following_id: req.params.userId,
        },
      },
    });
    res.json({ following: !!follow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

// Get followers list
router.get('/:userId/followers', optionalAuth, async (req, res) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { following_id: req.params.userId },
      include: { follower: { select: USER_PROFILE_SELECT } },
      orderBy: { created_at: 'desc' },
    });
    res.json(follows.map(f => f.follower));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get following list
router.get('/:userId/following', optionalAuth, async (req, res) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { follower_id: req.params.userId },
      include: { following: { select: USER_PROFILE_SELECT } },
      orderBy: { created_at: 'desc' },
    });
    res.json(follows.map(f => f.following));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Follow a user
router.post('/:userId', requireAuth, async (req, res) => {
  try {
    const followingId = req.params.userId;
    if (followingId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check target user exists
    const target = await prisma.user.findUnique({ where: { id: followingId } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Upsert follow (idempotent)
    await prisma.follow.upsert({
      where: {
        follower_id_following_id: {
          follower_id: req.user.id,
          following_id: followingId,
        },
      },
      create: {
        follower_id: req.user.id,
        following_id: followingId,
      },
      update: {},
    });

    // Increment counts
    const [updatedTarget] = await Promise.all([
      prisma.user.update({
        where: { id: followingId },
        data: { follower_count: { increment: 1 } },
        select: { follower_count: true },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: { following_count: { increment: 1 } },
      }),
    ]);

    // Notify the followed user
    await notify({
      userId: followingId,
      type: 'follow',
      message: 'Someone followed you.',
      data: { follower_id: req.user.id },
    });

    res.json({ following: true, follower_count: updatedTarget.follower_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/:userId', requireAuth, async (req, res) => {
  try {
    const followingId = req.params.userId;

    const existing = await prisma.follow.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: req.user.id,
          following_id: followingId,
        },
      },
    });

    if (!existing) {
      // Already not following — just return current count
      const target = await prisma.user.findUnique({
        where: { id: followingId },
        select: { follower_count: true },
      });
      return res.json({ following: false, follower_count: target?.follower_count ?? 0 });
    }

    await prisma.follow.delete({ where: { id: existing.id } });

    const [updatedTarget] = await Promise.all([
      prisma.user.update({
        where: { id: followingId },
        data: { follower_count: { decrement: 1 } },
        select: { follower_count: true },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: { following_count: { decrement: 1 } },
      }),
    ]);

    res.json({ following: false, follower_count: updatedTarget.follower_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

module.exports = router;
