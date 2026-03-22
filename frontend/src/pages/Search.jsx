import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import EmployerSearch from '../components/EmployerSearch';

export default function Search() {
  const [topEmployers, setTopEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/employers/top')
      .then(res => setTopEmployers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(place) {
    navigate(`/company/${place.place_id}`, {
      state: { name: place.name, address: place.address },
    });
  }

  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>
        Find an Employer
      </h1>

      <EmployerSearch onSelect={handleSelect} placeholder="Search by company name or location..." />

      <div style={{ marginTop: 28 }}>
        <div className="section-header" style={{ padding: '8px 0', marginBottom: 8, background: 'transparent' }}>
          Most Reviewed
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : topEmployers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <h3>No employers yet</h3>
            <p>Be the first to review your employer.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topEmployers.map((emp, i) => (
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
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 8,
                  background: 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  🏢
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.employer_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.employer_address}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {emp.review_count} reviews
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
