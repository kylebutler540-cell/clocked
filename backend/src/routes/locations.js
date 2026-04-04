const express = require('express');
const axios = require('axios');

const router = express.Router();

// City autocomplete for location picker — also handles ZIP codes
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) return res.json({ predictions: [] });

    // ZIP code detection: 5 digits (US) or partial 5-digit prefix
    const isZip = /^\d{3,5}$/.test(query.trim());

    if (isZip) {
      // Geocode ZIP directly to get city + lat/lng
      const geoRes = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: query.trim(),
          components: 'country:US',
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      });
      const results = geoRes.data.results || [];
      const predictions = results.slice(0, 4).map(r => {
        const comps = r.address_components || [];
        const locality = comps.find(c => c.types.includes('locality'))?.long_name;
        const postal = comps.find(c => c.types.includes('postal_code'))?.long_name;
        const state = comps.find(c => c.types.includes('administrative_area_level_1'))?.short_name;
        const label = postal && state ? `${postal}, ${state}` : r.formatted_address;
        const city = locality && state ? `${locality}, ${state}` : label;
        return {
          place_id: r.place_id,
          description: label,
          city,
          region: state || '',
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
          isZip: true,
          zipLabel: label,
        };
      });
      return res.json({ predictions });
    }

    // Regular city autocomplete
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

// Geocode a city name to lat/lng
router.get('/reverse-city', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: 'city required' });

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address: city, key: process.env.GOOGLE_MAPS_API_KEY },
    });

    const data = response.data;
    if (!data.results?.length) return res.status(404).json({ error: 'No results' });

    const { lat, lng } = data.results[0].geometry.location;
    res.json({ lat, lng });
  } catch (err) {
    console.error('Reverse city geocode error:', err.message);
    res.status(500).json({ error: 'Geocode failed' });
  }
});

// Geocode any input (city name or ZIP) → { lat, lng, label }
router.get('/geocode', async (req, res) => {
  try {
    const { input } = req.query;
    if (!input) return res.status(400).json({ error: 'input required' });

    const params = { address: input, key: process.env.GOOGLE_MAPS_API_KEY };
    if (/^\d{5}$/.test(input.trim())) params.components = 'country:US';

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', { params });
    const data = response.data;
    if (!data.results?.length) return res.status(404).json({ error: 'No results' });

    const result = data.results[0];
    const comps = result.address_components || [];
    const locality = comps.find(c => c.types.includes('locality'))?.long_name;
    const postal = comps.find(c => c.types.includes('postal_code'))?.long_name;
    const state = comps.find(c => c.types.includes('administrative_area_level_1'))?.short_name;

    let label;
    if (postal && state) label = `${postal}, ${state}`;
    else if (locality && state) label = `${locality}, ${state}`;
    else label = result.formatted_address.split(',').slice(0, 2).join(',').trim();

    const { lat, lng } = result.geometry.location;
    res.json({ lat, lng, label });
  } catch (err) {
    console.error('Geocode error:', err.message);
    res.status(500).json({ error: 'Geocode failed' });
  }
});

module.exports = router;
