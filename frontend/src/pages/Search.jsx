import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import GlobalSearch from '../components/GlobalSearch';

function getBrandSlug(name) {
  if (!name) return '';
  const stopWords = /\b(supercenter|superstore|super|store|market|supermarket|center|centre|depot|warehouse|express|neighborhood|garden|pharmacy|optical|gas|station|bakery|deli|cafe|restaurant|grill|bar|pub|inn|hotel|motel|suites|lodge|clinic|hospital|medical|dental|office|headquarters|corporate|co\.|inc\.|llc|ltd|group|holdings|corp|services|solutions)\b/gi;
  const brand = name.replace(stopWords, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)[0];
  return brand.toLowerCase();
}

function CompanyLogo({ name }) {
  const [err, setErr] = useState(false);
  const slug = getBrandSlug(name);
  const src = `https://logo.clearbit.com/${slug}.com`;
  if (err || !slug) {
    return (
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏢</div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0, background: '#fff', padding: 3, border: '1px solid var(--border)' }} />
  );
}

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

  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>
        Find an Employer
      </h1>

      <GlobalSearch placeholder="Search companies, reviews, people..." />

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
                <CompanyLogo name={emp.employer_name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.employer_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {(emp.employer_address || '').replace(/,?\s*USA\s*$/, '').trim()}
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
