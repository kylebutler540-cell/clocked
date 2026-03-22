import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Feed from '../components/Feed';
import LocationModal from '../components/LocationModal';

const SORT_OPTIONS = [
  { label: 'Latest', value: 'latest', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> },
  { label: 'Top Rated', value: 'top', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
];

export default function Home() {
  const navigate = useNavigate();
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
    <div className="home-layout">
      {/* Main feed column */}
      <div className="home-feed-column">
        {/* Sort + location bar */}
        <div className="feed-toolbar">
          <div className="sort-pills">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`sort-pill${sort === opt.value ? ' active' : ''}`}
                onClick={() => navigate(opt.value === 'latest' ? '/' : `/?sort=${opt.value}`)}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
          <button className="location-pill" onClick={() => setShowLocationModal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {location || 'Set location'}
          </button>
        </div>

        <Feed filters={filters} />
      </div>

      {/* Right sidebar — desktop only */}
      <div className="home-right-sidebar">
        {/* About Clocked */}
        <div className="right-widget">
          <div className="right-widget-header">About Clocked</div>
          <p className="right-widget-body">
            Anonymous workplace reviews from real workers. Know the truth before you take the job.
          </p>
          <button className="btn btn-primary btn-full" style={{ marginTop: 12, fontSize: 13 }} onClick={() => navigate('/create')}>
            Write a Review
          </button>
          <button className="btn btn-secondary btn-full" style={{ marginTop: 8, fontSize: 13 }} onClick={() => navigate('/signup')}>
            Create Account
          </button>
        </div>

        {/* Stats widget */}
        <div className="right-widget">
          <div className="right-widget-header">Grand Rapids</div>
          <div className="right-widget-stats">
            <div className="right-stat">
              <div className="right-stat-value">2</div>
              <div className="right-stat-label">Reviews</div>
            </div>
            <div className="right-stat">
              <div className="right-stat-value">2</div>
              <div className="right-stat-label">Employers</div>
            </div>
            <div className="right-stat">
              <div className="right-stat-value">100%</div>
              <div className="right-stat-label">Anonymous</div>
            </div>
          </div>
        </div>

        {/* Early access */}
        <div className="right-widget right-widget-promo">
          <div className="right-widget-badge">🎉 Early Access</div>
          <div className="right-widget-promo-title">First 100 users get 50% off Pro — forever.</div>
          <div className="right-widget-promo-price">$1.49<span>/mo</span></div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 12, fontSize: 13 }} onClick={() => navigate('/signup')}>
            Claim Offer
          </button>
        </div>

        <div className="right-widget-footer">
          <a href="#">Terms</a> · <a href="#">Privacy</a> · <a href="#">Contact</a>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>Clocked © 2026</div>
        </div>
      </div>

      {showLocationModal && <LocationModal onClose={handleLocationClose} />}
    </div>
  );
}
