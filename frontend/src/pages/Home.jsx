import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Feed from '../components/Feed';
import LocationModal from '../components/LocationModal';

export default function Home() {
  const [searchParams] = useSearchParams();
  const sort = searchParams.get('sort') || 'latest';

  const [location, setLocation] = useState(() => localStorage.getItem('userLocation') || '');
  const [showLocationModal, setShowLocationModal] = useState(false);

  function handleLocationClose(city) {
    if (city) setLocation(city);
    setShowLocationModal(false);
  }

  const filters = sort === 'top' ? { sort: 'top' } : {};
  if (location) filters.location = location;

  return (
    <>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setShowLocationModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            color: location ? 'var(--text-primary)' : 'var(--text-muted)',
            transition: 'border-color 0.15s ease',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:4,flexShrink:0}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {location || 'Set location'}
        </button>
      </div>

      <Feed filters={filters} />

      {showLocationModal && <LocationModal onClose={handleLocationClose} />}
    </>
  );
}
