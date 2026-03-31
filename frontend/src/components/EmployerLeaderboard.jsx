import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

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
    const fetchEmployers = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {};
        if (location) {
          params.location = location;
        }
        const res = await api.get('/posts/top-employers', { params });
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
        const cityPart = employer.employer_address.split(',')[0];
        return (
          <div
            key={employer.employer_place_id}
            className="employer-card"
            onClick={() => navigate(`/company/${employer.employer_place_id}`)}
          >
            <div className="employer-rank">#{index + 1}</div>
            <div className="employer-card-body">
              <div style={{ flex: 1 }}>
                <div className="employer-name">{employer.employer_name}</div>
                <div className="employer-city">{cityPart}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <span>⭐</span>
                    <span style={{ fontWeight: 600 }}>{employer.avg_rating}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {employer.review_count} {employer.review_count === 1 ? 'review' : 'reviews'}
                  </div>
                </div>
                <div className="employer-emoji-row">
                  {employer.good_count > 0 && <span>😊 {employer.good_count}</span>}
                  {employer.neutral_count > 0 && <span>😐 {employer.neutral_count}</span>}
                  {employer.bad_count > 0 && <span>😡 {employer.bad_count}</span>}
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}
