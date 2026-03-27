const express = require('express');
const axios = require('axios');

const router = express.Router();

// City autocomplete for location picker
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) return res.json({ predictions: [] });

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: {
        input: query,
        types: '(cities)',
        language: 'en',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const data = response.data;
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(502).json({ error: 'Places API error', details: data.status });
    }

    const predictions = (data.predictions || []).slice(0, 6).map(p => ({
      place_id: p.place_id,
      description: p.description,
      city: p.structured_formatting?.main_text || p.description.split(',')[0],
      region: p.structured_formatting?.secondary_text || '',
    }));

    res.json({ predictions });
  } catch (err) {
    console.error('Location search error:', err.message);
    res.status(500).json({ error: 'Location search failed' });
  }
});

// Reverse geocode lat/lng to city name
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${lat},${lng}`,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const data = response.data;
    if (!data.results?.length) return res.status(404).json({ error: 'No results' });

    const components = data.results[0].address_components;
    const locality = components.find(c => c.types.includes('locality'));
    const state = components.find(c => c.types.includes('administrative_area_level_1'));
    const city = locality && state
      ? `${locality.long_name}, ${state.short_name}`
      : data.results[0].formatted_address.split(',').slice(0, 2).join(',').trim();

    res.json({ city });
  } catch (err) {
    console.error('Reverse geocode error:', err.message);
    res.status(500).json({ error: 'Reverse geocode failed' });
  }
});

module.exports = router;
