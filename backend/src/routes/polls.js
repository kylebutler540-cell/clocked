const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/polls/:pollId — public, shows results only if user voted
router.get('/:pollId', optionalAuth, async (req, res) => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.pollId },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    let userVote = null;
    if (req.user) {
      userVote = await prisma.pollVote.findUnique({
        where: { poll_id_user_id: { poll_id: poll.id, user_id: req.user.id } },
      });
    }

    const hasVoted = !!userVote;
    const totalVotes = hasVoted
      ? poll.options.reduce((sum, o) => sum + o.vote_count, 0)
      : null;

    res.json({
      id: poll.id,
      question: poll.question,
      options: poll.options.map(o => ({
        id: o.id,
        text: o.text,
        position: o.position,
        vote_count: hasVoted ? o.vote_count : null,
      })),
      user_voted_option_id: userVote?.poll_option_id ?? null,
      total_votes: totalVotes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// POST /api/polls/:pollId/vote — requires auth
router.post('/:pollId/vote', requireAuth, async (req, res) => {
  try {
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ error: 'optionId required' });

    const poll = await prisma.poll.findUnique({
      where: { id: req.params.pollId },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const option = poll.options.find(o => o.id === optionId);
    if (!option) return res.status(400).json({ error: 'Invalid option' });

    // Check for existing vote (@@unique poll_id+user_id enforces one vote)
    const existing = await prisma.pollVote.findUnique({
      where: { poll_id_user_id: { poll_id: poll.id, user_id: req.user.id } },
    });
    if (existing) return res.status(409).json({ error: 'Already voted' });

    await prisma.$transaction(async (tx) => {
      await tx.pollVote.create({
        data: {
          poll_id: poll.id,
          poll_option_id: optionId,
          user_id: req.user.id,
        },
      });
      await tx.pollOption.update({
        where: { id: optionId },
        data: { vote_count: { increment: 1 } },
      });
    });

    // Fetch updated poll for response
    const updated = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: { options: { orderBy: { position: 'asc' } } },
    });

    const totalVotes = updated.options.reduce((sum, o) => sum + o.vote_count, 0);

    res.json({
      id: updated.id,
      question: updated.question,
      options: updated.options.map(o => ({
        id: o.id,
        text: o.text,
        position: o.position,
        vote_count: o.vote_count,
      })),
      user_voted_option_id: optionId,
      total_votes: totalVotes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

module.exports = router;
