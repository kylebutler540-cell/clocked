import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { cacheGet, cacheSet, isFresh } from '../lib/cache';
import BusinessLogo from './BusinessLogo';

// Read-only star display with half-star support
function StarDisplay({ rating }) {
  if (!rating && rating !== 0) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 1, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const full = rating >= i;
        const half = !full && rating >= i - 0.5;
        return (
          <span key={i} style={{ fontSize: 13, position: 'relative', display: 'inline-block', width: 13, color: 'var(--border)' }}>
            {full ? (
              <span style={{ color: '#A855F7' }}>★</span>
            ) : half ? (
              <>
                <span style={{ position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden', color: '#A855F7' }}>★</span>
                <span>★</span>
              </>
            ) : (
              <span>★</span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="employer-card employer-skeleton">
      <div className="employer-rank" style={{ background: 'rgba(168, 85, 247, 0.1)' }}></div>
      <div style={{ flex: 1 }}>
        <div className="skeleton-block" style={{ width: '60%', height: 15, marginBottom: 8 }} />
        <div className="skeleton-block" style={{ width: '40%', height: 12, marginBottom: 6 }} />
        <div className="skeleton-block" style={{ width: '50%', height: 12 }} />
      </div>
    </div>
  );
}

const FILTER_OPTIONS = [
  { key: 'highest', label: 'Highest Rated' },
  { key: 'lowest', label: 'Lowest Rated' },
  { key: 'nearest', label: 'Nearest to Me' },
];

export default function EmployerLeaderboard({ location }) {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logoBatch, setLogoBatch] = useState(null);
  const [filter, setFilter] = useState('highest');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = React.useRef(null);

  React.useEffect(() => {
    if (!filterOpen) return;
    function handle(e) { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); }
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('touchstart', handle); };
  }, [filterOpen]);

  useEffect(() => {
    const cacheKey = 'employer-leaderboard/' + (location || '');

    // Load from cache first
    const cached = cacheGet(cacheKey);
    const fresh = isFresh(cacheKey);

    if (cached && fresh) {
      // Fresh cache — show immediately, no fetch
      setEmployers(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // Stale or no cache — show skeleton, fetch, reveal all at once
    setLoading(true);
    const fetchEmployers = async () => {
      try {
        setError(null);
        const params = {};
        if (location) params.location = location;
        const res = await api.get('/posts/employer-leaderboard', { params });
        cacheSet(cacheKey, res.data);
        setEmployers(res.data);
      } catch (err) {
        console.error('Failed to fetch top employers:', err);
        setError('Failed to load employers');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployers();
  }, [location]);

  useEffect(() => {
    if (!employers.length) {
      setLogoBatch(null);
      return;
    }
    setLogoBatch(null);
    const ids = employers.map(e => e.employer_place_id).filter(Boolean).slice(0, 25);
    api
      .post('/employers/logos/batch', { placeIds: ids })
      .then(res => setLogoBatch(res.data.logos || {}))
      .catch(() => setLogoBatch({}));
  }, [employers]);

  if (loading) {
    return (
      <div className="employer-leaderboard">
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!location) {
    return (
      <div className="employer-leaderboard">
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text-muted)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, display: 'inline-block' }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p style={{ fontSize: 14, fontWeight: 500 }}>Set your location to see top employers in your area</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="employer-leaderboard">
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text)',
        }}>
          <p style={{ fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (employers.length === 0) {
    return (
      <div className="employer-leaderboard">
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text-muted)',
        }}>
          <p style={{ fontSize: 14 }}>No employers found in {location} yet.</p>
        </div>
      </div>
    );
  }

  const emojiMap = { GOOD: '😊', NEUTRAL: '😐', BAD: '😡' };

  const sorted = [...employers].sort((a, b) => {
    if (filter === 'lowest') return (a.avg_rating || 0) - (b.avg_rating || 0);
    if (filter === 'nearest') return (a.distance_miles ?? 9999) - (b.distance_miles ?? 9999);
    return (b.avg_rating || 0) - (a.avg_rating || 0);
  });

  return (
    <div className="employer-leaderboard">
      {/* Filter bar */}
      <div ref={filterRef} style={{ display: 'flex', alignItems: 'center', marginBottom: 12, position: 'relative', paddingLeft: 12 }}>
        <button
          onClick={() => setFilterOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 20,
            border: '1px solid var(--purple)',
            background: filterOpen ? 'var(--purple-glow)' : 'var(--bg-elevated)',
            color: 'var(--purple)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
            <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
            <line x1="4" y1="18" x2="20" y2="18"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
          </svg>
          {FILTER_OPTIONS.find(f => f.key === filter)?.label}
        </button>
        {filterOpen && (
          <div
            onClick={() => setFilterOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          />
        )}
        {filterOpen && (
          <div style={{
            position: 'absolute', top: '110%', left: 0,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, zIndex: 50, minWidth: 160,
            boxShadow: '0 8px 24px var(--shadow-lg)', overflow: 'hidden',
          }}>
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => { setFilter(opt.key); setFilterOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '11px 16px', fontSize: 14, fontWeight: filter === opt.key ? 700 : 500,
                  color: filter === opt.key ? 'var(--purple)' : 'var(--text-primary)',
                  background: filter === opt.key ? 'var(--purple-glow)' : 'transparent',
                  cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {sorted.map((employer, index) => {
        const fullAddr = (employer.employer_address || '').replace(/,?\s*USA\s*$/, '').trim();
        return (
          <div
            key={employer.employer_place_id + '-' + index}
            className="employer-card"
            onClick={() => navigate(`/company/${employer.employer_place_id}`)}
          >
            <div className="employer-rank">#{index + 1}</div>

            <div style={{ flexShrink: 0 }}>
              <BusinessLogo variant="batched" batch={logoBatch} placeId={employer.employer_place_id} name={employer.employer_name} size={40} borderRadius={10} />
            </div>

            <div className="employer-info-col">
              <div className="employer-name">{employer.employer_name}</div>
              <div className="employer-city">{fullAddr}</div>
              {employer.distance_miles != null && (
                <div className="employer-distance">{employer.distance_miles} mi away</div>
              )}
            </div>

            <div className="employer-rating-col">
              {employer.avg_rating != null && employer.star_rating_count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {employer.avg_rating}
                  </span>
                  <StarDisplay rating={employer.avg_rating} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    ({employer.star_rating_count >= 1000
                      ? `${(employer.star_rating_count / 1000).toFixed(1)}K`
                      : employer.star_rating_count})
                  </span>
                </div>
              )}
              <div className="employer-emoji-row">
                {employer.good_count > 0 && <span><span className="emoji" style={{ filter: 'sepia(1) saturate(4) hue-rotate(65deg) brightness(0.9)' }}>😊</span><span className="count">{employer.good_count}</span></span>}
                {employer.neutral_count > 0 && <span><span className="emoji">😐</span><span className="count">{employer.neutral_count}</span></span>}
                {employer.bad_count > 0 && <span><span className="emoji">😡</span><span className="count">{employer.bad_count}</span></span>}
              </div>
            </div>

            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
