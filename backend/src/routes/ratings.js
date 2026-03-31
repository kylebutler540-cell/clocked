const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/ratings/:placeId — get average rating + user's own rating (if logged in)
router.get('/:placeId', optionalAuth, async (req, res) => {
  try {
    const { placeId } = req.params;

    const aggPromise = prisma.companyRating.aggregate({
      where: { place_id: placeId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const userRatingPromise = req.user
      ? prisma.companyRating.findUnique({
          where: { user_id_place_id: { user_id: req.user.id, place_id: placeId } },
        })
      : Promise.resolve(null);

    const [agg, userRating] = await Promise.all([aggPromise, userRatingPromise]);

    res.json({
      averageRating: agg._avg.rating || 0,
      totalRatings: agg._count.rating,
      userRating: userRating?.rating || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// POST /api/ratings — upsert a star rating for a company
router.post('/', requireAuth, async (req, res) => {
  try {
    const { placeId, rating } = req.body;
    if (!placeId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'placeId and rating (1–5) are required' });
    }

    const saved = await prisma.companyRating.upsert({
      where: { user_id_place_id: { user_id: req.user.id, place_id: placeId } },
      update: { rating },
      create: { user_id: req.user.id, place_id: placeId, rating },
    });

    res.json({ success: true, rating: saved.rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// DELETE /api/ratings/:placeId — remove user's star rating
router.delete('/:placeId', requireAuth, async (req, res) => {
  try {
    await prisma.companyRating.deleteMany({
      where: { user_id: req.user.id, place_id: req.params.placeId },
    });
    const agg = await prisma.companyRating.aggregate({
      where: { place_id: req.params.placeId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    res.json({ success: true, averageRating: agg._avg.rating || 0, totalRatings: agg._count.rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear rating' });
  }
});

module.exports = router;
