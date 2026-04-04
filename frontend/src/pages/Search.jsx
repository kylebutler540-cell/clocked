import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { cacheGet, cacheSet } from '../lib/cache';
import EmployerSearch from '../components/EmployerSearch';
import BusinessLogo from '../components/BusinessLogo';

function getDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDist(miles) {
  if (miles < 1) return '< 1 mile';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export default function Search() {
  const [topEmployers, setTopEmployers] = useState(() => cacheGet('top-employers') || []);
  const [logoBatch, setLogoBatch] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const navigate = useNavigate();

  // Load user coords from localStorage
  useEffect(() => {
    const cached = localStorage.getItem('userLatLng');
    if (cached) {
      const [lat, lng] = cached.split(',').map(Number);
      if (lat && lng) setUserCoords([lat, lng]);
    }
    // Also listen for location changes
    function onLocationChange() {
      const updated = localStorage.getItem('userLatLng');
      if (updated) {
        const [lat, lng] = updated.split(',').map(Number);
        if (lat && lng) setUserCoords([lat, lng]);
      }
    }
    window.addEventListener('locationchange', onLocationChange);
    return () => window.removeEventListener('locationchange', onLocationChange);
  }, []);

  useEffect(() => {
    const location = localStorage.getItem('userLocation') || '';
    api.get('/employers/top', { params: location ? { location } : {} })
      .then(res => { setTopEmployers(res.data); cacheSet('top-employers', res.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!topEmployers.length) {
      setLogoBatch(null);
      return;
    }
    setLogoBatch(null);
    const ids = topEmployers.map(e => e.place_id).filter(Boolean).slice(0, 25);
    api
      .post('/employers/logos/batch', { placeIds: ids })
      .then(res => setLogoBatch(res.data.logos || {}))
      .catch(() => setLogoBatch({}));
  }, [topEmployers]);

  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>
        Find an Employer
      </h1>

      <EmployerSearch onSelect={place => navigate(`/company/${place.place_id}`, { state: { name: place.name, address: place.address } })} placeholder="Search by company name or location..." />

      <div style={{ marginTop: 28 }}>
        <div className="section-header" style={{ padding: '8px 0', marginBottom: 8, background: 'transparent' }}>
          {userCoords ? 'Nearest to You' : 'Most Reviewed'}
        </div>

        {topEmployers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <h3>No employers yet</h3>
            <p>Be the first to review your employer.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(() => {
              // Sort by distance if we have coords, otherwise keep review-count order
              let list = [...topEmployers];
              if (userCoords) {
                const [uLat, uLng] = userCoords;
                list = list.map(emp => {
                  if (emp.lat && emp.lng) {
                    const d = getDistanceMiles(uLat, uLng, emp.lat, emp.lng);
                    return { ...emp, distanceMiles: d };
                  }
                  return { ...emp, distanceMiles: 9999 };
                });
                list.sort((a, b) => a.distanceMiles - b.distanceMiles);
              }
              return list.map(emp => (
                <button
                  key={emp.place_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 0',
                    borderBottom: '1px solid var(--border)',
                    textAlign: 'left',
                    background: 'transparent',
                    width: '100%',
                    transition: 'background var(--transition)',
                  }}
                  onClick={() => navigate(`/company/${emp.place_id}`, {
                    state: { name: emp.employer_name, address: emp.employer_address },
                  })}
                >
                  <BusinessLogo variant="batched" batch={logoBatch} placeId={emp.place_id} name={emp.employer_name} size={36} borderRadius={8} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {emp.employer_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(emp.employer_address || '').replace(/,?\s*USA\s*$/, '').trim()}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0, textAlign: 'right' }}>
                    {emp.distanceMiles != null && emp.distanceMiles < 9999
                      ? formatDist(emp.distanceMiles)
                      : `${emp.review_count} reviews`}
                  </div>
                </button>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
