import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// Strip generic suffixes to get the brand name for logo lookup
function getBrandSlug(name) {
  if (!name) return '';
  const stopWords = /\b(supercenter|superstore|super|store|market|supermarket|center|centre|depot|warehouse|express|neighborhood|garden|pharmacy|optical|gas|station|bakery|deli|cafe|restaurant|grill|bar|pub|inn|hotel|motel|suites|lodge|clinic|hospital|medical|dental|office|headquarters|corporate|co\.|inc\.|llc|ltd|group|holdings|corp|services|solutions)\b/gi;
  const brand = name.replace(stopWords, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)[0];
  return brand.toLowerCase();
}

function CompanyLogo({ name, size = 32 }) {
  const [err, setErr] = useState(false);
  const slug = getBrandSlug(name);
  const src = `https://logo.clearbit.com/${slug}.com`;
  const style = { width: size, height: size, borderRadius: 8, objectFit: 'contain', flexShrink: 0, background: '#fff', padding: 3, border: '1px solid var(--border)' };
  if (err || !slug) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.55, padding: 0, background: 'var(--bg-elevated)' }}>🏢</div>
    );
  }
  return <img src={src} alt={name} onError={() => setErr(true)} style={style} />;
}

function UserAvatar({ avatarUrl, displayName, size = 32 }) {
  const initial = displayName ? displayName[0].toUpperCase() : 'A';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.4, overflow: 'hidden',
      border: '1px solid var(--border)',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial}
    </div>
  );
}

const RATING_COLORS = { BAD: '#EF4444', NEUTRAL: '#EAB308', GOOD: '#22C55E' };
const RATING_LABELS = { BAD: 'Bad', NEUTRAL: 'Neutral', GOOD: 'Good' };

export default function GlobalSearch({ placeholder = 'Search companies, reviews, people...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = no search yet
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await api.get('/search', { params: { q } });
      setResults(res.data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasResults = results && (results.companies.length > 0 || results.posts.length > 0 || results.users.length > 0);
  const noResults = results && !hasResults && query.length >= 2;
  const showDropdown = open && (loading || hasResults || noResults);

  function close() { setOpen(false); setQuery(''); setResults(null); }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, maxWidth: 520 }}>
      <div className="search-input-wrapper">
        <span className="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          className="form-input"
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {query.length > 0 && (
          <button
            onMouseDown={e => { e.preventDefault(); setQuery(''); setResults(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 8px', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
          >×</button>
        )}
      </div>

      {showDropdown && (
        <div className="search-results" style={{ maxHeight: 480, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 14 }}>Searching...</div>
          )}

          {!loading && noResults && (
            <div style={{ padding: '16px 14px', color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>No results for "{query}"</div>
          )}

          {!loading && results?.companies.length > 0 && (
            <>
              <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Companies</div>
              {results.companies.map(c => (
                <div key={c.place_id} className="search-result-item" onMouseDown={() => {
                  navigate(`/company/${c.place_id}`, { state: { name: c.name, address: c.address } });
                  close();
                }}>
                  <CompanyLogo name={c.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="search-result-name">{c.name}</div>
                    {c.address && <div className="search-result-address">{c.address.replace(/,?\s*USA\s*$/, '').trim()}</div>}
                  </div>
                </div>
              ))}
            </>
          )}

          {!loading && results?.users.length > 0 && (
            <>
              <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>People</div>
              {results.users.map(u => (
                <div key={u.id} className="search-result-item" onMouseDown={() => {
                  navigate(`/profile/${u.id}`);
                  close();
                }}>
                  <UserAvatar avatarUrl={u.avatar_url} displayName={u.display_name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="search-result-name">{u.display_name || u.username}</div>
                    {u.username && <div className="search-result-address">@{u.username}</div>}
                  </div>
                  {u.follower_count > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{u.follower_count} followers</span>
                  )}
                </div>
              ))}
            </>
          )}

          {!loading && results?.posts.length > 0 && (
            <>
              <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reviews</div>
              {results.posts.map(p => (
                <div key={p.id} className="search-result-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }} onMouseDown={() => {
                  navigate(`/post/${p.id}`);
                  close();
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <CompanyLogo name={p.employer_name} size={24} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.employer_name}
                    </span>
                    {p.rating_emoji && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: RATING_COLORS[p.rating_emoji], flexShrink: 0 }}>
                        {RATING_LABELS[p.rating_emoji]}
                      </span>
                    )}
                  </div>
                  {p.header && (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {p.header}
                    </div>
                  )}
                  {p.body && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.body}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
