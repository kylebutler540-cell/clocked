import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { cacheGet, cacheSet } from '../lib/cache';

// Read-only star display with half-star support
function StarDisplay({ rating }) {
  if (!rating) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 1, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const full = rating >= i;
        const half = !full && rating >= i - 0.5;
        return (
          <span key={i} style={{ fontSize: 15, color: full || half ? '#A855F7' : 'var(--border)', position: 'relative', display: 'inline-block', width: 15 }}>
            {full ? '★' : half ? (
              <span>
                <span style={{ position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden', color: '#A855F7' }}>★</span>
                <span style={{ color: 'var(--border)' }}>★</span>
              </span>
            ) : '★'}
          </span>
        );
      })}
    </span>
  );
}
import Feed from '../components/Feed';
import StarRating from '../components/StarRating';

const GREEN_EMOJI_FILTER = 'hue-rotate(85deg) saturate(1.4) brightness(1.1)';

const FILTER_OPTIONS = [
  { label: 'All', value: null, color: null },
  { label: 'Bad', emoji: '😡', value: 'BAD', color: '#EF4444' },
  { label: 'Neutral', emoji: '😐', value: 'NEUTRAL', color: '#EAB308' },
  { label: 'Good', emoji: '😊', value: 'GOOD', color: '#22C55E', greenEmoji: true },
];

export default function CompanyProfile() {
  const { placeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const stateInfo = location.state || {};

  const [profile, setProfile] = useState(null);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const cacheKey = `employer-profile/${placeId}`;
    const cached = cacheGet(cacheKey);
    if (cached) setProfile(cached);
    api.get(`/employers/profile/${placeId}`)
      .then(res => { cacheSet(cacheKey, res.data); setProfile(res.data); })
      .catch(() => {});
  }, [placeId]);

  // Debounce keyword for live search
  useEffect(() => {
    const t = setTimeout(() => setKeyword(keywordInput.trim()), 300);
    return () => clearTimeout(t);
  }, [keywordInput]);

  const total = profile?.total_reviews || 0;
  const counts = profile?.rating_counts || { GOOD: 0, NEUTRAL: 0, BAD: 0 };

  function barWidth(count) {
    if (!total) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  }

  function handleFilterClick(value) {
    setRatingFilter(value);
    if (value === null) {
      setKeywordInput('');
      setKeyword('');
      inputRef.current?.blur();
    }
  }

  const employerInfo = {
    place_id: placeId,
    name: profile?.employer_name || stateInfo.name,
    address: profile?.employer_address || stateInfo.address,
  };

  const feedFilters = {
    employer_place_id: placeId,
    ...(ratingFilter ? { rating: ratingFilter } : {}),
    ...(keyword ? { search: keyword } : {}),
  };

  return (
    <div className="company-page">
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
          <div style={{ flex: 1 }}>
            <h1 className="company-name" style={{ margin: '0 0 4px' }}>
              {profile?.employer_name || stateInfo.name || 'Company'}
            </h1>
            {(() => {
              const addr = profile?.employer_address || stateInfo.address || '';
              const name = profile?.employer_name || stateInfo.name || '';
              const mapsQuery = encodeURIComponent(`${name} ${addr}`.trim());
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
              return addr ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="company-address"
                  style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--purple)', textDecoration: 'none', fontSize: 13 }}
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {addr.replace(/,?\s*USA\s*$/, '').trim()}
                </a>
              ) : null;
            })()}
            {/* Star rating row — 4.1 ★★★★☆ (247) */}
            {(profile?.star_rating_count > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {profile.avg_rating}
                </span>
                <StarDisplay rating={profile.avg_rating} />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  ({profile.star_rating_count >= 1000
                    ? `${(profile.star_rating_count / 1000).toFixed(1)}K`
                    : profile.star_rating_count})
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
              <StarRating placeId={placeId} />
              <button
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={() => navigate('/create', { state: { employer: employerInfo } })}
              >
                Post a Review
              </button>
            </div>
          </div>
        </div>

        {/* Rating bars */}
        {total > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="rating-bar">
              <span className="rating-bar-label" style={{ filter: GREEN_EMOJI_FILTER }}>😊</span>
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

      {/* Live keyword search */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="search-input-wrapper" style={{ display: 'block' }}>
          <span className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input
            ref={inputRef}
            className="form-input"
            type="text"
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            placeholder="Search reviews (pay, management...)"
            style={{ paddingRight: keywordInput.length > 0 ? 36 : undefined }}
          />
          {keywordInput.length > 0 && (
            <button
              type="button"
              onClick={() => { setKeywordInput(''); setKeyword(''); inputRef.current?.blur(); }}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                color: 'var(--text-muted)',
                fontSize: 18,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          )}
        </div>
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
              onClick={() => handleFilterClick(opt.value)}
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
              {opt.emoji && (
                <span style={opt.greenEmoji ? { filter: GREEN_EMOJI_FILTER } : {}}>{opt.emoji} </span>
              )}
              {opt.label}
            </button>
          );
        })}
      </div>

      <Feed filters={feedFilters} employerInfo={employerInfo} />
    </div>
  );
}
