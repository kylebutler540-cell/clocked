const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Helper: build response for a poll + who voted
function buildPollResponse(poll, votedOptionId) {
  const total = poll.options.reduce((sum, o) => sum + o.vote_count, 0);
  return {
    id: poll.id,
    question: poll.question,
    options: poll.options.map(o => ({
      id: o.id,
      text: o.text,
      position: o.position,
      vote_count: o.vote_count,
    })),
    user_voted_option_id: votedOptionId ?? null,
    total_votes: total,
  };
}

// GET /api/polls/:pollId
router.get('/:pollId', optionalAuth, async (req, res) => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.pollId },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    let votedOptionId = null;
    if (req.user) {
      const vote = await prisma.pollVote.findUnique({
        where: { poll_id_user_id: { poll_id: poll.id, user_id: req.user.id } },
      });
      votedOptionId = vote?.poll_option_id ?? null;
    }

    res.json(buildPollResponse(poll, votedOptionId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// POST /api/polls/:pollId/vote — supports first vote AND changing vote
router.post('/:pollId/vote', requireAuth, async (req, res) => {
  try {
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ error: 'optionId required' });

    const poll = await prisma.poll.findUnique({
      where: { id: req.params.pollId },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const newOption = poll.options.find(o => o.id === optionId);
    if (!newOption) return res.status(400).json({ error: 'Invalid option' });

    const existing = await prisma.pollVote.findUnique({
      where: { poll_id_user_id: { poll_id: poll.id, user_id: req.user.id } },
    });

    if (existing) {
      // Already voted — change vote if different option selected
      if (existing.poll_option_id === optionId) {
        // Same option tapped again — return current state unchanged
        const updated = await prisma.poll.findUnique({
          where: { id: poll.id },
          include: { options: { orderBy: { position: 'asc' } } },
        });
        return res.json(buildPollResponse(updated, optionId));
      }

      // Different option — swap vote atomically
      await prisma.$transaction(async (tx) => {
        // Decrement old option
        await tx.pollOption.update({
          where: { id: existing.poll_option_id },
          data: { vote_count: { decrement: 1 } },
        });
        // Increment new option
        await tx.pollOption.update({
          where: { id: optionId },
          data: { vote_count: { increment: 1 } },
        });
        // Update vote record
        await tx.pollVote.update({
          where: { id: existing.id },
          data: { poll_option_id: optionId },
        });
      });
    } else {
      // First vote
      await prisma.$transaction(async (tx) => {
        await tx.pollVote.create({
          data: { poll_id: poll.id, poll_option_id: optionId, user_id: req.user.id },
        });
        await tx.pollOption.update({
          where: { id: optionId },
          data: { vote_count: { increment: 1 } },
        });
      });
    }

    const updated = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: { options: { orderBy: { position: 'asc' } } },
    });

    res.json(buildPollResponse(updated, optionId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// DELETE /api/polls/:pollId/vote — remove current user's vote
router.delete('/:pollId/vote', requireAuth, async (req, res) => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.pollId },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const existing = await prisma.pollVote.findUnique({
      where: { poll_id_user_id: { poll_id: poll.id, user_id: req.user.id } },
    });
    if (!existing) return res.status(404).json({ error: 'No vote to remove' });

    await prisma.$transaction(async (tx) => {
      await tx.pollVote.delete({ where: { id: existing.id } });
      await tx.pollOption.update({
        where: { id: existing.poll_option_id },
        data: { vote_count: { decrement: 1 } },
      });
    });

    const updated = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: { options: { orderBy: { position: 'asc' } } },
    });

    res.json(buildPollResponse(updated, null)); // user_voted_option_id = null (unvoted)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove vote' });
  }
});

module.exports = router;
