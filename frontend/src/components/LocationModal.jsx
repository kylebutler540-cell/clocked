import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/api';

export default function LocationModal({ onClose }) {
  const [cityInput, setCityInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const sheetRef = useRef(null);
  const dragStartY = useRef(null);
  const dragCurrentY = useRef(null);
  const [keyboardUp, setKeyboardUp] = useState(false);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Detect soft keyboard open on mobile (viewport shrinks)
  useEffect(() => {
    if (!window.visualViewport) return;
    function onResize() {
      const ratio = window.visualViewport.height / window.screen.height;
      setKeyboardUp(ratio < 0.75);
    }
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport.removeEventListener('resize', onResize);
  }, []);

  function handleTouchStart(e) {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }

  function handleTouchMove(e) {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    dragCurrentY.current = e.touches[0].clientY;
    if (dy > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  }

  function handleTouchEnd() {
    if (dragStartY.current === null) return;
    const dy = dragCurrentY.current - dragStartY.current;
    if (dy > 80) {
      // Swipe down far enough — dismiss
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.2s ease';
        sheetRef.current.style.transform = 'translateY(120%)';
        setTimeout(() => onClose(null), 200);
      } else {
        onClose(null);
      }
    } else {
      // Snap back
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.2s ease';
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
    dragStartY.current = null;
  }

  function handleInput(e) {
    const val = e.target.value;
    setCityInput(val);
    clearTimeout(debounceRef.current);
    if (val.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/locations/search', { params: { query: val } });
        setSuggestions(res.data.predictions || []);
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
          const res = await api.get('/locations/reverse', { params: { lat: latitude, lng: longitude } });
          if (res.data.city) {
            localStorage.setItem('userLocation', res.data.city);
            dispatchLocationChange(res.data.city);
            onClose(res.data.city);
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

  function dispatchLocationChange(city) {
    window.dispatchEvent(new CustomEvent('locationchange', { detail: { city } }));
  }

  function handleSelect(prediction) {
    const city = `${prediction.city}${prediction.region ? ', ' + prediction.region.split(',')[0].trim() : ''}`;
    localStorage.setItem('userLocation', city);
    dispatchLocationChange(city);
    onClose(city);
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(null)}>
      <div
        className="modal-sheet"
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={keyboardUp ? { marginBottom: '40%', transition: 'margin-bottom 0.2s ease' } : { transition: 'margin-bottom 0.2s ease' }}
      >
        <div
          className="modal-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: 'grab', padding: '8px 0', margin: '-8px auto 12px' }}
        />
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
            <div className="search-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4 }}>
              {loading && (
                <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 14 }}>Searching…</div>
              )}
              {suggestions.slice(0, 4).map(s => (
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
