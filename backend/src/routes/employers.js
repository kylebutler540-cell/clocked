const express = require('express');
const axios = require('axios');
const prisma = require('../lib/prisma');
const {
  getOrResolveLogo,
  getOrResolveLogosBatch,
  invalidateLogo,
} = require('../lib/employerLogo');
const { getLogoUrl } = require('../lib/brandLogo');

const router = express.Router();

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const GOOGLE_PLACES_V1 = 'https://places.googleapis.com/v1/places';

// Haversine distance in miles
function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Search employers — uses Text Search (returns coords) then sorts by true distance
router.get('/search', async (req, res) => {
  try {
    const { query, lat, lng, location } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    // Resolve user coords — prefer explicit lat/lng, fallback to geocoding location string
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

    // Use Text Search — returns results with geometry, searchable within radius
    // This guarantees we get ALL nearby matches, not just autocomplete-biased ones
    const response = await axios.get(`${GOOGLE_PLACES_BASE}/textsearch/json`, {
      params: {
        query,
        location: `${latitude},${longitude}`,
        radius: 80000, // 50 miles — wide enough to catch all local results
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const results = response.data.results || [];

    // Map to standard shape — geometry is already included in text search
    let predictions = results.slice(0, 20).map(r => ({
      place_id: r.place_id,
      name: r.name,
      address: r.formatted_address || r.vicinity || '',
      description: r.name,
      lat: r.geometry?.location?.lat ?? null,
      lng: r.geometry?.location?.lng ?? null,
    }));

    // Sort strictly by distance from user — closest first, always
    predictions = predictions
      .map(p => ({
        ...p,
        _dist: (p.lat && p.lng) ? distanceMiles(latitude, longitude, p.lat, p.lng) : 9999,
      }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, 10) // return top 10 closest
      .map(({ _dist, ...rest }) => rest);

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

// Resolved logo URL — uses brand map first, then Places lookup, then heuristic.
router.get('/logo/:placeId', async (req, res) => {
  try {
    const { name } = req.query;
    const placeId = req.params.placeId;
    const logoUrl = await getLogoUrl(name || '', placeId);
    res.json({
      placeId,
      domain: null,
      logoUrl,
      logoLastUpdated: new Date().toISOString(),
      source: 'brand',
    });
  } catch (err) {
    console.error('Logo endpoint error:', err.message);
    res.json({
      placeId: req.params.placeId,
      domain: null,
      logoUrl: null,
      logoLastUpdated: null,
      source: null,
    });
  }
});

// Batch logos for search UIs (deduped, limited concurrency server-side)
router.post('/logos/batch', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.placeIds) ? req.body.placeIds : [];
    const capped = ids.filter(Boolean).slice(0, 25);
    const logos = await getOrResolveLogosBatch(capped, 4);
    res.json({ logos });
  } catch (err) {
    console.error('Batch logos error:', err.message);
    res.status(500).json({ error: 'Batch logo fetch failed' });
  }
});

// Client reports broken image — force refresh on next fetch
router.post('/logo/:placeId/invalidate', async (req, res) => {
  try {
    await invalidateLogo(req.params.placeId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Logo invalidate error:', err.message);
    res.json({ ok: false });
  }
});

// Get employer profile (aggregated from our DB)
router.get('/profile/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    const [posts, ratings, starAgg, logoRow] = await Promise.all([
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
      prisma.employerLogo.findUnique({ where: { place_id: placeId } }),
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
      domain: logoRow?.domain ?? null,
      logo_url: logoRow?.logo_url ?? null,
      logo_last_updated: logoRow?.logo_last_updated ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employer profile' });
  }
});

// Geocode an address to lat/lng (best-effort, non-fatal)
async function geocodeAddress(address) {
  if (!address || !process.env.GOOGLE_MAPS_API_KEY) return { lat: null, lng: null };
  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address, key: process.env.GOOGLE_MAPS_API_KEY },
      timeout: 4000,
    });
    const loc = res.data?.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : { lat: null, lng: null };
  } catch {
    return { lat: null, lng: null };
  }
}

// Get top employers by review count, with lat/lng for distance sorting
router.get('/top', async (req, res) => {
  try {
    const grouped = await prisma.post.groupBy({
      by: ['employer_place_id', 'employer_name', 'employer_address'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 30,
    });

    const ids = grouped.map(g => g.employer_place_id);
    const logos = await prisma.employerLogo.findMany({
      where: { place_id: { in: ids } },
    });
    const logoByPlace = Object.fromEntries(logos.map(l => [l.place_id, l]));

    // Geocode addresses in parallel to get lat/lng for distance sorting
    const withCoords = await Promise.all(grouped.map(async g => {
      const coords = await geocodeAddress(g.employer_address);
      return {
        place_id: g.employer_place_id,
        employer_name: g.employer_name,
        employer_address: g.employer_address,
        review_count: g._count.id,
        logo_url: logoByPlace[g.employer_place_id]?.logo_url ?? null,
        domain: logoByPlace[g.employer_place_id]?.domain ?? null,
        lat: coords.lat,
        lng: coords.lng,
      };
    }));

    res.json(withCoords);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top employers' });
  }
});

module.exports = router;
