const express = require('express');
const axios = require('axios');
const prisma = require('../lib/prisma');

const router = express.Router();

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const GOOGLE_PLACES_V1 = 'https://places.googleapis.com/v1/places';

// Search employers via Google Places API v1 (new, fresher data)
router.get('/search', async (req, res) => {
  try {
    const { query, lat, lng, location } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    // Use provided lat/lng or geocode location string, fallback to Grand Rapids
    let latitude = parseFloat(lat) || null;
    let longitude = parseFloat(lng) || null;

    if (!latitude || !longitude) {
      const locationBias = location || 'Grand Rapids, MI';
      try {
        const geoRes = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: { address: locationBias, key: process.env.GOOGLE_MAPS_API_KEY },
        });
        if (geoRes.data.status === 'OK' && geoRes.data.results[0]) {
          const loc = geoRes.data.results[0].geometry.location;
          latitude = loc.lat;
          longitude = loc.lng;
        }
      } catch { /* use default */ }
      latitude = latitude || 42.9634;
      longitude = longitude || -85.6681;
    }

    // Use new Places API v1 autocomplete
    const response = await axios.post(`${GOOGLE_PLACES_V1}:autocomplete`, {
      input: query,
      includedPrimaryTypes: ['establishment'],
      locationBias: {
        circle: {
          center: { latitude, longitude },
          radius: 50000,
        },
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const suggestions = response.data.suggestions || [];

    const predictions = suggestions.slice(0, 5).map(s => {
      const p = s.placePrediction;
      return {
        place_id: p.placeId,
        name: p.structuredFormat?.mainText?.text || p.text?.text || '',
        address: p.structuredFormat?.secondaryText?.text || '',
        description: p.text?.text || '',
        lat: null,
        lng: null,
      };
    });

    res.json({ predictions });
  } catch (err) {
    console.error('Employer search error:', err.response?.data || err.message);
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

// Get logo domain for a company via Google Places website field
// Returns { domain } — frontend uses this with clearbit
const logoCache = new Map(); // placeId -> domain string or null, in-memory cache

router.get('/logo/:placeId', async (req, res) => {
  const { placeId } = req.params;

  // Serve from cache if available
  if (logoCache.has(placeId)) {
    return res.json({ domain: logoCache.get(placeId) });
  }

  try {
    const response = await axios.get(`${GOOGLE_PLACES_BASE}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'website',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    let domain = null;
    const website = response.data?.result?.website;
    if (website) {
      try {
        const url = new URL(website);
        // Strip www. prefix
        domain = url.hostname.replace(/^www\./, '');
      } catch { /* bad URL, skip */ }
    }

    logoCache.set(placeId, domain);
    res.json({ domain });
  } catch (err) {
    console.error('Logo lookup error:', err.message);
    res.json({ domain: null });
  }
});

// Get employer profile (aggregated from our DB)
router.get('/profile/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    const [posts, ratings, starAgg] = await Promise.all([
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
      prisma.companyRating.aggregate({
        where: { place_id: placeId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const totalReviews = ratings.reduce((acc, r) => acc + r._count.rating_emoji, 0);
    const ratingCounts = { BAD: 0, NEUTRAL: 0, GOOD: 0 };
    ratings.forEach(r => { ratingCounts[r.rating_emoji] = r._count.rating_emoji; });

    // Use explicit star ratings only (not emoji-derived)
    const star_rating_count = starAgg._count.rating || 0;
    const avg_rating = star_rating_count > 0
      ? Math.round((starAgg._avg.rating) * 10) / 10
      : null;

    res.json({
      place_id: placeId,
      employer_name: posts[0]?.employer_name || null,
      employer_address: posts[0]?.employer_address || null,
      total_reviews: totalReviews,
      rating_counts: ratingCounts,
      avg_rating,
      star_rating_count,
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
