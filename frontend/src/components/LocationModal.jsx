import React, { useState } from 'react';

const GOOGLE_API_KEY = 'AIzaSyDVTt1iv8oqd9ziIMyqs_jCo6et5iucc2s';

export default function LocationModal({ onClose }) {
  const [cityInput, setCityInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUseLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
          );
          const data = await res.json();
          let city = '';
          if (data.results && data.results.length > 0) {
            const components = data.results[0].address_components;
            const locality = components.find(c => c.types.includes('locality'));
            const state = components.find(c => c.types.includes('administrative_area_level_1'));
            if (locality && state) {
              city = `${locality.long_name}, ${state.short_name}`;
            } else if (locality) {
              city = locality.long_name;
            } else {
              city = data.results[0].formatted_address.split(',').slice(0, 2).join(',').trim();
            }
          }
          if (city) {
            localStorage.setItem('userLocation', city);
            onClose(city);
          } else {
            setError('Could not determine your city. Please type it manually.');
          }
        } catch {
          setError('Failed to reverse geocode. Please type your city manually.');
        }
        setLoading(false);
      },
      () => {
        setError('Location access denied. Please type your city manually.');
        setLoading(false);
      }
    );
  }

  function handleManualSubmit() {
    const city = cityInput.trim();
    if (!city) return;
    localStorage.setItem('userLocation', city);
    onClose(city);
  }

  function handleSkip() {
    onClose(null);
  }

  return (
    <div className="modal-overlay" onClick={handleSkip}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">Where are you located?</h2>
        <p className="modal-subtitle" style={{ marginBottom: 20 }}>
          Find workplace reviews near you.
        </p>

        <button
          className="btn btn-primary btn-full"
          onClick={handleUseLocation}
          disabled={loading}
          style={{ marginBottom: 12 }}
        >
          {loading ? 'Getting location…' : '📍 Use my location'}
        </button>

        {error && (
          <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className="form-input"
            placeholder="Or type your city…"
            value={cityInput}
            onChange={e => setCityInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
          />
          <button
            className="btn btn-secondary"
            onClick={handleManualSubmit}
            disabled={!cityInput.trim()}
            style={{ flexShrink: 0 }}
          >
            Set
          </button>
        </div>

        <button className="btn btn-ghost btn-full" onClick={handleSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
