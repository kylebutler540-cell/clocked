import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../lib/api';
import Feed from '../components/Feed';

const FILTER_OPTIONS = [
  { label: 'All', value: null, color: null },
  { label: '😡 Bad', value: 'BAD', color: '#EF4444' },
  { label: '😐 Neutral', value: 'NEUTRAL', color: '#EAB308' },
  { label: '😊 Good', value: 'GOOD', color: '#22C55E' },
];

export default function CompanyProfile() {
  const { placeId } = useParams();
  const location = useLocation();
  const stateInfo = location.state || {};

  const [profile, setProfile] = useState(null);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    api.get(`/employers/profile/${placeId}`)
      .then(res => setProfile(res.data))
      .catch(() => {});
  }, [placeId]);

  const total = profile?.total_reviews || 0;
  const counts = profile?.rating_counts || { GOOD: 0, NEUTRAL: 0, BAD: 0 };

  function barWidth(count) {
    if (!total) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  }

  function handleKeywordSearch(e) {
    e.preventDefault();
    setKeyword(keywordInput.trim());
  }

  const feedFilters = {
    employer_place_id: placeId,
    ...(ratingFilter ? { rating: ratingFilter } : {}),
    ...(keyword ? { search: keyword } : {}),
  };

  return (
    <div>
      {/* Company header */}
      <div className="company-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>
            🏢
          </div>
          <div>
            <h1 className="company-name">
              {profile?.employer_name || stateInfo.name || 'Company'}
            </h1>
            <p className="company-address">
              {profile?.employer_address || stateInfo.address || ''}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {total} {total === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        </div>

        {/* Rating bars */}
        {total > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="rating-bar">
              <span className="rating-bar-label">😊</span>
              <div className="rating-bar-track">
                <div className="rating-bar-fill fill-good" style={{ width: barWidth(counts.GOOD) }} />
              </div>
              <span className="rating-bar-count">{counts.GOOD}</span>
            </div>
            <div className="rating-bar">
              <span className="rating-bar-label">😐</span>
              <div className="rating-bar-track">
                <div className="rating-bar-fill fill-neutral" style={{ width: barWidth(counts.NEUTRAL) }} />
              </div>
              <span className="rating-bar-count">{counts.NEUTRAL}</span>
            </div>
            <div className="rating-bar">
              <span className="rating-bar-label">😡</span>
              <div className="rating-bar-track">
                <div className="rating-bar-fill fill-bad" style={{ width: barWidth(counts.BAD) }} />
              </div>
              <span className="rating-bar-count">{counts.BAD}</span>
            </div>
          </div>
        )}
      </div>

      {/* Keyword search */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <form onSubmit={handleKeywordSearch} style={{ display: 'flex', gap: 8 }}>
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <span className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <input
              className="form-input"
              type="text"
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              placeholder="Search reviews (pay, management...)"
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ padding: '10px 14px' }}>
            Go
          </button>
        </form>
      </div>

      {/* Rating filter tabs */}
      <div className="filter-tabs">
        {FILTER_OPTIONS.map(opt => {
          const isActive = ratingFilter === opt.value;
          const color = opt.color;
          return (
            <button
              key={opt.label}
              className="filter-tab"
              onClick={() => setRatingFilter(opt.value)}
              style={color ? {
                background: isActive ? color : `${color}22`,
                borderColor: color,
                color: isActive ? 'white' : color,
                boxShadow: isActive ? `0 2px 8px ${color}55` : 'none',
              } : {
                background: isActive ? 'var(--purple)' : 'var(--bg-elevated)',
                borderColor: isActive ? 'var(--purple)' : 'var(--border)',
                color: isActive ? 'white' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 2px 8px rgba(168,85,247,0.3)' : 'none',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <Feed filters={feedFilters} />
    </div>
  );
}
