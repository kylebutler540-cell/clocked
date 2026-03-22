import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../lib/api';

function getDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function EmployerSearch({ onSelect, placeholder = 'Search employer...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const userLocation = localStorage.getItem('userLocation') || 'Grand Rapids, MI';
      const userLatLng = localStorage.getItem('userLatLng'); // "lat,lng" if GPS used
      const res = await api.get('/employers/search', { params: { query: q, location: userLocation } });
      let predictions = res.data.predictions || [];

      // Add distance if we have user's exact coords and result has coords
      if (userLatLng) {
        const [uLat, uLng] = userLatLng.split(',').map(Number);
        predictions = predictions.map(p => {
          if (p.lat && p.lng) {
            const miles = getDistanceMiles(uLat, uLng, p.lat, p.lng);
            return { ...p, distance: miles < 1 ? '< 1 mi' : `${miles.toFixed(1)} mi` };
          }
          return p;
        });
      }

      setResults(predictions);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(place) {
    onSelect(place);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          className="form-input"
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="search-results">
          {loading && (
            <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 14 }}>
              Searching...
            </div>
          )}
          {results.map(place => (
            <div
              key={place.place_id}
              className="search-result-item"
              onMouseDown={() => handleSelect(place)}
            >
              <span className="search-result-icon">🏢</span>
              <div className="search-result-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="search-result-name">{place.name}</div>
                <div className="search-result-address">{place.address}</div>
              </div>
              {place.distance && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                  {place.distance}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div className="search-results">
          <div style={{ padding: '16px 14px', color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
            No results found
          </div>
        </div>
      )}
    </div>
  );
}
