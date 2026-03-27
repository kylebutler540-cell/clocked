import React, { useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-production-7798f.up.railway.app';

export default function LocationModal({ onClose }) {
  const [cityInput, setCityInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  function handleInput(e) {
    const val = e.target.value;
    setCityInput(val);
    clearTimeout(debounceRef.current);
    if (val.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/locations/search?query=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.predictions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  async function handleUseLocation() {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          localStorage.setItem('userLatLng', `${latitude},${longitude}`);
          const res = await fetch(`${API_BASE}/api/locations/reverse?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          if (data.city) {
            localStorage.setItem('userLocation', data.city);
            onClose(data.city);
          } else {
            setError('Could not detect your city. Please type it manually.');
          }
        } catch {
          setError('Failed to detect location. Please type manually.');
        }
        setGeoLoading(false);
      },
      () => { setError('Location access denied. Please type your city.'); setGeoLoading(false); }
    );
  }

  function handleSelect(prediction) {
    const city = `${prediction.city}${prediction.region ? ', ' + prediction.region.split(',')[0].trim() : ''}`;
    localStorage.setItem('userLocation', city);
    onClose(city);
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(null)}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">Where are you located?</h2>
        <p className="modal-subtitle" style={{ marginBottom: 20 }}>
          Find workplace reviews near you.
        </p>

        <button
          className="btn btn-primary btn-full"
          onClick={handleUseLocation}
          disabled={geoLoading}
          style={{ marginBottom: 12 }}
        >
          {geoLoading ? 'Getting location…' : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>Use my exact location</>
          )}
        </button>

        {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            className="form-input"
            placeholder="Search city…"
            value={cityInput}
            onChange={handleInput}
            autoComplete="off"
          />
          {(suggestions.length > 0 || loading) && (
            <div className="search-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100 }}>
              {loading && (
                <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 14 }}>Searching…</div>
              )}
              {suggestions.map(s => (
                <div key={s.place_id} className="search-result-item" onMouseDown={() => handleSelect(s)}>
                  <span className="search-result-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  </span>
                  <div className="search-result-info">
                    <div className="search-result-name">{s.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-ghost btn-full" onClick={() => onClose(null)}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
