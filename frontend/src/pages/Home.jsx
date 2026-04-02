import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Feed from '../components/Feed';
import EmployerLeaderboard from '../components/EmployerLeaderboard';

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

  return (
    <div className="home-layout">
      <div className="home-feed-column">
        {sort === 'top' ? (
          <EmployerLeaderboard location={location} />
        ) : (
          <Feed filters={filters} />
        )}
      </div>
      <div className="home-right-sidebar">
        <RightSidebar />
      </div>
    </div>
  );
}
