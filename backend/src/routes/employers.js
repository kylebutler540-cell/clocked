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

// Department/sub-listing suffixes to filter out for general searches
const DEPARTMENT_PATTERNS = [
  /\bpharmacy\b/i,
  /\bvision\s*center\b/i,
  /\boptical\b/i,
  /\btire\s*(center|shop|service)?\b/i,
  /\bhearing\s*aid\b/i,
  /\bauto\s*center\b/i,
  /\bauto\s*care\b/i,
  /\bgas\s*station\b/i,
  /\bfuel\s*station\b/i,
  /\bjewelry\b/i,
  /\bportrait\s*studio\b/i,
  /\bphoto\s*center\b/i,
  /\bpickup\b/i,
  /\bdelivery\b/i,
  /\bdeli\b/i,
  /\bbakery\b/i,
  /\bfloral\b/i,
  /\bbank\s*branch\b/i,
  /\bmcdonald'?s\b.*\binside\b/i, // e.g. "McDonald's inside Walmart"
  /\bfood\s*court\b/i,
  /\bcafe\b/i,
  /\bsnack\s*bar\b/i,
  /\bwarehouse\s*pick\b/i,
  /\bonline\s*order\b/i,
  /\bcurbside\b/i,
  /\bself.checkout\b/i,
];

// Returns true if the user's query is explicitly asking for a department
function queryIsDepartmentSpecific(query) {
  const q = query.toLowerCase();
  return DEPARTMENT_PATTERNS.some(p => p.test(q));
}

// Score how "main" a listing name is — lower score = more main/general
function mainListingScore(name) {
  const n = name.toLowerCase();
  // Department-level listings get a high score (less preferred)
  if (DEPARTMENT_PATTERNS.some(p => p.test(n))) return 100;
  // Names that are just the brand name are most preferred (score 0)
  // Names with extra descriptors (Supercenter, Wholesale, etc.) are fine
  return 0;
}

// Deduplicate results: for each physical location (rounded coords),
// keep only the most "main" listing. Removes department sub-entries.
function deduplicateByLocation(predictions) {
  const buckets = new Map();
  for (const p of predictions) {
    // Round coords to ~300m grid to group same-location entries
    // (departments like pharmacy/tire are often listed at slightly offset coords)
    const key = p.lat && p.lng
      ? `${Math.round(p.lat * 333) / 333},${Math.round(p.lng * 333) / 333}`
      : p.place_id;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, p);
    } else {
      // Keep whichever listing is more "main"
      if (mainListingScore(p.name) < mainListingScore(existing.name)) {
        buckets.set(key, p);
      }
    }
  }
  return Array.from(buckets.values());
}

// Well-known brand names — exact/prefix matches on these get a strong boost
const KNOWN_BRANDS = new Set([
  'walmart','target','costco','meijer','kroger','aldi','whole foods','amazon',
  'home depot','lowes','menards','dollar general','dollar tree','five below',
  'best buy','apple','microsoft','google','meta',
  'mcdonalds','burger king','wendys','taco bell','chick-fil-a','chipotle',
  'culvers','five guys','panera','subway','jersey mikes','dominos','pizza hut',
  'papa johns','little caesars','starbucks','dunkin','tim hortons','dairy queen',
  'sonic','applebees','dennys','olive garden','buffalo wild wings',
  'ups','fedex','usps','dhl','xpo',
  'cvs','walgreens','rite aid','spectrum health','sparrow','mercy health',
  'chase','bank of america','wells fargo','fifth third','huntington',
  'autozone','oreilly','advance auto','napa',
  'service professor','gtf technologies',
]);

/**
 * Relevance score for a result given a query — lower = more relevant.
 * Blended with distance to produce the final sort order.
 *
 * Scoring breakdown:
 *  0 = perfect prefix match on a known brand
 *  1 = prefix match on any name
 *  2 = full word match
 *  3 = contains match
 *  4 = no match (shouldn't appear, but just in case)
 * 
 * Each tier also gets a "noise penalty" for long/complex names with
 * many unrelated words, so "Ferguson 987COS" scores worse than "Costco".
 */
function relevanceScore(name, query) {
  const n = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  // Check if name or normalized name is a known brand
  const nNoBrand = n
    .replace(/\b(supercenter|wholesale|store|stores|inc|llc|corp|co|company)\b/g, '')
    .trim();
  const isKnown = KNOWN_BRANDS.has(n) || KNOWN_BRANDS.has(nNoBrand) ||
    [...KNOWN_BRANDS].some(b => n.startsWith(b));

  // Prefix match: name starts with query
  if (n.startsWith(q) || nNoBrand.startsWith(q)) {
    return isKnown ? 0 : 1;
  }

  // Word boundary match: query matches a whole word in name
  const wordBoundary = new RegExp(`\\b${q.replace(/\s+/g, '\\s+')}`, 'i');
  if (wordBoundary.test(n)) {
    // Penalize names where the query word appears late or with lots of surrounding noise
    const wordCount = n.split(/\s+/).length;
    const noisePenalty = Math.min(wordCount * 0.1, 0.5);
    return isKnown ? 2 : 2 + noisePenalty;
  }

  // Contains match anywhere
  if (n.includes(q)) {
    const wordCount = n.split(/\s+/).length;
    const noisePenalty = Math.min(wordCount * 0.2, 1.0);
    return isKnown ? 3 : 3 + noisePenalty;
  }

  // No direct match — text search returned it for some reason, deprioritize
  return 5;
}

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

    // Find any known brands whose name starts with the query (for prefix expansion)
    const qLower = query.trim().toLowerCase();
    const brandExpansions = [...KNOWN_BRANDS].filter(b => b.startsWith(qLower) && b !== qLower);

    // Build search requests: always search the raw query, plus top brand expansion if found
    const searchRequests = [query.trim()];
    if (brandExpansions.length > 0) {
      searchRequests.push(brandExpansions[0]); // top brand match e.g. "costco"
    }

    // Run all searches in parallel
    const allResponses = await Promise.all(
      searchRequests.map(q =>
        axios.get(`${GOOGLE_PLACES_BASE}/textsearch/json`, {
          params: {
            query: q,
            location: `${latitude},${longitude}`,
            radius: 80000,
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
        }).then(r => r.data.results || []).catch(() => [])
      )
    );

    // Merge and deduplicate by place_id
    const seen = new Set();
    const results = [];
    for (const batch of allResponses) {
      for (const r of batch) {
        if (!seen.has(r.place_id)) {
          seen.add(r.place_id);
          results.push(r);
        }
      }
    }

    // Map to standard shape — geometry is already included in text search
    let predictions = results.slice(0, 20).map(r => ({
      place_id: r.place_id,
      name: r.name,
      address: r.formatted_address || r.vicinity || '',
      description: r.name,
      lat: r.geometry?.location?.lat ?? null,
      lng: r.geometry?.location?.lng ?? null,
    }));

    // For general searches, collapse department sub-listings into one main result per location
    if (!queryIsDepartmentSpecific(query)) {
      // First pass: remove any result whose name contains a department keyword
      predictions = predictions.filter(p => !DEPARTMENT_PATTERNS.some(pat => pat.test(p.name)));
      // Second pass: deduplicate by physical location, keep most "main" listing
      predictions = deduplicateByLocation(predictions);
    }

    // Score and sort: relevance-first within reasonable distance bands,
    // then distance. This ensures "Costco" beats "Ferguson 987COS" for query "cos"
    // while still surfacing the closest Costco first.
    predictions = predictions
      .map(p => {
        const dist = (p.lat && p.lng) ? distanceMiles(latitude, longitude, p.lat, p.lng) : 9999;
        const rel = relevanceScore(p.name, query);
        // Blend: relevance is primary (0–5 scale), distance is secondary
        // Normalize distance into a 0–2 scale capped at 50 miles so local results
        // stay local but don't trump a clearly more relevant result
        const distNorm = Math.min(dist / 25, 2);
        const score = rel * 3 + distNorm;
        return { ...p, _dist: dist, _score: score };
      })
      .sort((a, b) => a._score - b._score)
      .slice(0, 10)
      .map(({ _dist, _score, ...rest }) => rest);

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
// Also includes companies that have star ratings but zero emoji-review posts
router.get('/top', async (req, res) => {
  try {
    const grouped = await prisma.post.groupBy({
      by: ['employer_place_id', 'employer_name', 'employer_address'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 30,
    });

    const postPlaceIds = new Set(grouped.map(g => g.employer_place_id));

    // Find companies with star ratings but no posts
    // Pull one rating row per place_id to get stored employer_name
    const starOnlyRatings = await prisma.companyRating.groupBy({
      by: ['place_id'],
      _avg: { rating: true },
      _count: { rating: true },
      where: { place_id: { notIn: [...postPlaceIds] } },
    });

    // Get employer names stored in companyRating rows
    const starOnlyPlaceIds = starOnlyRatings.map(r => r.place_id);
    const starOnlyNameRows = await prisma.companyRating.findMany({
      where: { place_id: { in: starOnlyPlaceIds }, employer_name: { not: null } },
      select: { place_id: true, employer_name: true, employer_address: true },
      distinct: ['place_id'],
    });
    const nameByPlace = Object.fromEntries(starOnlyNameRows.map(r => [r.place_id, r]));

    const starOnlyWithName = starOnlyRatings.map(r => ({
      employer_place_id: r.place_id,
      employer_name: nameByPlace[r.place_id]?.employer_name || null,
      employer_address: nameByPlace[r.place_id]?.employer_address || null,
      _count: { id: 0 },
      _star_avg: r._avg.rating,
      _star_count: r._count.rating,
    }));

    // Combine: posts list + star-only (null-name ones will be filtered on frontend)
    const combined = [
      ...grouped.map(g => ({ ...g, _star_avg: null, _star_count: 0 })),
      ...starOnlyWithName,
    ];

    const ids = combined.map(g => g.employer_place_id);

    // Fetch star ratings for companies that came from posts (enrich them)
    const starRatings = await prisma.companyRating.groupBy({
      by: ['place_id'],
      _avg: { rating: true },
      _count: { rating: true },
      where: { place_id: { in: [...postPlaceIds] } },
    });
    const starByPlace = Object.fromEntries(starRatings.map(r => [r.place_id, r]));

    const logos = await prisma.employerLogo.findMany({
      where: { place_id: { in: ids } },
    });
    const logoByPlace = Object.fromEntries(logos.map(l => [l.place_id, l]));

    // Geocode addresses in parallel to get lat/lng for distance sorting
    const withCoords = await Promise.all(combined.map(async g => {
      if (!g.employer_name) return null; // can't display without a name
      const coords = await geocodeAddress(g.employer_address);
      const star = starByPlace[g.employer_place_id];
      return {
        place_id: g.employer_place_id,
        employer_name: g.employer_name,
        employer_address: g.employer_address,
        review_count: g._count.id,
        avg_rating: star?._avg?.rating ?? g._star_avg ?? null,
        star_rating_count: star?._count?.rating ?? g._star_count ?? 0,
        logo_url: logoByPlace[g.employer_place_id]?.logo_url ?? null,
        domain: logoByPlace[g.employer_place_id]?.domain ?? null,
        lat: coords.lat,
        lng: coords.lng,
      };
    }));

    res.json(withCoords.filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top employers' });
  }
});

module.exports = router;
