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
          📍 {location || 'Set location'}
        </button>
      </div>

      <Feed filters={filters} />

      {showLocationModal && <LocationModal onClose={handleLocationClose} />}
    </>
  );
}
