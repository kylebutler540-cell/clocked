import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../lib/api';

const _logoDomainCache = {};

// Company logo — fetches real domain from backend via Google Places, then uses Clearbit
function CompanyLogo({ placeId, name }) {
  const [domain, setDomain] = useState(_logoDomainCache[placeId] ?? undefined);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    if (!placeId) return;
    if (_logoDomainCache[placeId] !== undefined) {
      setDomain(_logoDomainCache[placeId]);
      return;
    }
    api.get(`/employers/logo/${placeId}`)
      .then(res => {
        const d = res.data.domain || null;
        _logoDomainCache[placeId] = d;
        setDomain(d);
      })
      .catch(() => {
        _logoDomainCache[placeId] = null;
        setDomain(null);
      });
  }, [placeId]);

  if (!domain || imgErr) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0, border: '1px solid var(--border)',
      }}>🏢</div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      onError={() => setImgErr(true)}
      style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0, background: '#fff', padding: 3, border: '1px solid var(--border)' }}
    />
  );
}

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

  // Get or geocode user lat/lng (cached in localStorage)
  const getUserLatLng = useCallback(async () => {
    const cached = localStorage.getItem('userLatLng');
    if (cached) return cached.split(',').map(Number);
    const userLocation = localStorage.getItem('userLocation');
    if (!userLocation) return null;
    try {
      const res = await api.get('/locations/reverse-city', { params: { city: userLocation } });
      if (res.data.lat && res.data.lng) {
        const coords = `${res.data.lat},${res.data.lng}`;
        localStorage.setItem('userLatLng', coords);
        return [res.data.lat, res.data.lng];
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const userLocation = localStorage.getItem('userLocation') || 'Grand Rapids, MI';
      const [res, userCoords] = await Promise.all([
        api.get('/employers/search', { params: { query: q, location: userLocation } }),
        getUserLatLng(),
      ]);
      let predictions = res.data.predictions || [];

      // Add distance + sort by closest if we have user coords
      if (userCoords) {
        const [uLat, uLng] = userCoords;
        predictions = predictions.map(p => {
          if (p.lat && p.lng) {
            const miles = getDistanceMiles(uLat, uLng, p.lat, p.lng);
            return { ...p, distanceNum: miles, distance: miles < 1 ? '< 1 mi' : `${miles.toFixed(1)} mi` };
          }
          return { ...p, distanceNum: 9999 };
        });
        predictions.sort((a, b) => a.distanceNum - b.distanceNum);
      }

      setResults(predictions);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [getUserLatLng]);

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

  async function handleSelect(place) {
    // Fetch full place details to get the complete formatted address (street number included)
    let enriched = { ...place };
    try {
      const details = await api.get(`/employers/details/${place.place_id}`);
      if (details.data?.formatted_address) {
        enriched.address = details.data.formatted_address;
      }
      if (details.data?.name) {
        enriched.name = details.data.name;
      }
    } catch { /* fall back to autocomplete data */ }
    onSelect(enriched);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div className="search-input-wrapper">
        <span className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
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
              <CompanyLogo name={place.name} placeId={place.place_id} />
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
