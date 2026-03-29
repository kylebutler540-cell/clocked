import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Feed from '../components/Feed';

function RightSidebar() {
  const navigate = useNavigate();
  return (
    <>
      <div className="right-widget">
        <div className="right-widget-header">About Clocked</div>
        <div className="right-widget-body">
          <p style={{ marginBottom: 12 }}>
            Anonymous workplace reviews from real workers. No real names, no HR watching.
          </p>
          <p>Browse freely or post your own experience — completely free.</p>
        </div>
      </div>

      <div className="right-widget">
        <div className="right-widget-header">Community</div>
        <div className="right-widget-stats">
          <div className="right-stat">
            <div className="right-stat-value">100%</div>
            <div className="right-stat-label">Anonymous</div>
          </div>
          <div className="right-stat">
            <div className="right-stat-value">Free</div>
            <div className="right-stat-label">To Browse</div>
          </div>
          <div className="right-stat">
            <div className="right-stat-value">Real</div>
            <div className="right-stat-label">Workers</div>
          </div>
        </div>
      </div>

      <button
        className="sidebar-premium-cta"
        onClick={() => navigate('/profile')}
        style={{ width: '100%' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#A855F7" stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.2px' }}>Go Premium</span>
        </div>
        <div style={{ fontSize: 12, marginBottom: 10, opacity: 0.7, lineHeight: 1.35 }}>
          Unlock full reviews from real workers
        </div>
        <div style={{
          background: '#A855F7',
          color: '#FFFFFF',
          borderRadius: 8,
          padding: '7px 0',
          fontWeight: 800,
          fontSize: 13,
          textAlign: 'center',
          letterSpacing: '-0.2px',
        }}>
          Start Free Trial
        </div>
      </button>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, padding: '0 2px' }}>
        <a href="#" style={{ marginRight: 8 }}>Terms</a>
        <a href="#" style={{ marginRight: 8 }}>Privacy</a>
        <a href="#">Contact</a>
        <div style={{ marginTop: 4 }}>© 2026 Clocked</div>
      </div>
    </>
  );
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const sort = searchParams.get('sort') || 'latest';

  const [location, setLocation] = useState(() => localStorage.getItem('userLocation') || '');

  useEffect(() => {
    function sync() {
      setLocation(localStorage.getItem('userLocation') || '');
    }
    function syncFromEvent(e) {
      if (e.detail?.city) setLocation(e.detail.city);
    }
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('locationchange', syncFromEvent);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('locationchange', syncFromEvent);
    };
  }, []);

  const filters = sort === 'top' ? { sort: 'top' } : {};
  if (location) filters.location = location;

  return (
    <div className="home-layout">
      <div className="home-feed-column">
        <Feed filters={filters} />
      </div>
      <div className="home-right-sidebar">
        <RightSidebar />
      </div>
    </div>
  );
}
