const express = require('express');
const axios = require('axios');
const prisma = require('../lib/prisma');

const router = express.Router();

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

// Search employers via Google Places autocomplete
router.get('/search', async (req, res) => {
  try {
    const { query, location } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    const params = {
      input: query,
      key: process.env.GOOGLE_MAPS_API_KEY,
      types: 'establishment',
      language: 'en',
    };
    if (location) params.location = location;

    const response = await axios.get(`${GOOGLE_PLACES_BASE}/autocomplete/json`, { params });
    const data = response.data;

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', data.status, data.error_message);
      return res.status(502).json({ error: 'Places API error', details: data.status });
    }

    const predictions = (data.predictions || []).map(p => ({
      place_id: p.place_id,
      name: p.structured_formatting?.main_text || p.description,
      address: p.structured_formatting?.secondary_text || '',
      description: p.description,
    }));

    res.json({ predictions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Employer search failed' });
  }
});

// Get place details
router.get('/details/:placeId', async (req, res) => {
  try {
    const response = await axios.get(`${GOOGLE_PLACES_BASE}/details/json`, {
      params: {
        place_id: req.params.placeId,
        fields: 'place_id,name,formatted_address,geometry,formatted_phone_number,website,types',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const data = response.data;
    if (data.status !== 'OK') {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json(data.result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employer details' });
  }
});

// Get employer profile (aggregated from our DB)
router.get('/profile/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    const [posts, ratings] = await Promise.all([
      prisma.post.findMany({
        where: { employer_place_id: placeId },
        orderBy: { created_at: 'desc' },
        take: 1,
        select: { employer_name: true, employer_address: true },
      }),
      prisma.post.groupBy({
        by: ['rating_emoji'],
        where: { employer_place_id: placeId },
        _count: { rating_emoji: true },
      }),
    ]);

    const totalReviews = ratings.reduce((acc, r) => acc + r._count.rating_emoji, 0);
    const ratingCounts = { BAD: 0, NEUTRAL: 0, GOOD: 0 };
    ratings.forEach(r => { ratingCounts[r.rating_emoji] = r._count.rating_emoji; });

    res.json({
      place_id: placeId,
      employer_name: posts[0]?.employer_name || null,
      employer_address: posts[0]?.employer_address || null,
      total_reviews: totalReviews,
      rating_counts: ratingCounts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employer profile' });
  }
});

// Get top employers by review count
router.get('/top', async (req, res) => {
  try {
    const grouped = await prisma.post.groupBy({
      by: ['employer_place_id', 'employer_name', 'employer_address'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    res.json(grouped.map(g => ({
      place_id: g.employer_place_id,
      employer_name: g.employer_name,
      employer_address: g.employer_address,
      review_count: g._count.id,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top employers' });
  }
});

module.exports = router;
