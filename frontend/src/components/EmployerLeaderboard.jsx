import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { cacheGet, cacheSet } from '../lib/cache';

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
import { cacheGet, cacheSet } from '../lib/cache';

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

export default function EmployerLeaderboard({ location }) {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cacheKey = 'employer-leaderboard/' + (location || '');

    // Load from cache first
    const cached = cacheGet(cacheKey);
    if (cached) {
      setEmployers(cached);
      setLoading(false);
      setError(null);
    }

    // Always revalidate in background
    const fetchEmployers = async () => {
      try {
        setError(null);
        const params = {};
        if (location) {
          params.location = location;
        }
        const res = await api.get('/posts/employer-leaderboard', { params });
        const changed = JSON.stringify(res.data) !== JSON.stringify(cached);
        cacheSet(cacheKey, res.data);
        if (changed) {
          setEmployers(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch top employers:', err);
        if (!cached) {
          setError('Failed to load employers');
        }
      } finally {
        if (!cached) setLoading(false);
      }
    };

    fetchEmployers();
  }, [location]);

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

  return (
    <div className="employer-leaderboard">
      {employers.map((employer, index) => {
        // Extract "City, State" from address like "123 Main St, Grand Rapids, MI, USA"
        const addrParts = employer.employer_address.split(",").map(s => s.trim());
        const cityPart = addrParts.length >= 3
          ? `${addrParts[addrParts.length - 3]}, ${addrParts[addrParts.length - 2]}`
          : addrParts.slice(0, 2).join(", ");
        return (
          <div
            key={employer.employer_place_id}
            className="employer-card"
            onClick={() => navigate(`/company/${employer.employer_place_id}`)}
          >
            <div className="employer-rank">#{index + 1}</div>

            <div className="employer-info-col">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <div className="employer-name">{employer.employer_name}</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  ({employer.review_count})
                </span>
              </div>
              <div className="employer-city">{cityPart}</div>
              {employer.distance_miles != null && (
                <div className="employer-distance">{employer.distance_miles} mi away</div>
              )}
            </div>

            <div className="employer-rating-col">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <StarDisplay rating={employer.avg_rating} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  ({employer.avg_rating})
                </span>
              </div>
              <div className="employer-emoji-row">
                {employer.good_count > 0 && <span><span className="emoji">😊</span><span className="count">{employer.good_count}</span></span>}
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
