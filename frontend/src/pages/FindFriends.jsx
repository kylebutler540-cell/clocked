import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { lsGet, lsSet } from '../lib/cache';

// sessionStorage: active search state (only kept when navigating INTO a profile)
const FF_ACTIVE_KEY = 'ff_search_state';
// localStorage: recent search history (persists across sessions)
const FF_HISTORY_KEY = 'ff_search_history';
const MAX_HISTORY = 10;

function readHistory() {
  try { return JSON.parse(localStorage.getItem(FF_HISTORY_KEY)) || []; } catch { return []; }
}
function saveHistory(items) {
  try { localStorage.setItem(FF_HISTORY_KEY, JSON.stringify(items)); } catch {}
}
function addToHistory(user) {
  const history = readHistory();
  const filtered = history.filter(h => h.id !== user.id);
  const updated = [{ id: user.id, display_name: user.display_name, username: user.username, avatar_url: user.avatar_url, anon_number: user.anon_number }, ...filtered].slice(0, MAX_HISTORY);
  saveHistory(updated);
}
function removeFromHistory(userId) {
  saveHistory(readHistory().filter(h => h.id !== userId));
}

function UserAvatar({ url, name, size = 44 }) {
  const letter = (name || '?')[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: url ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38, userSelect: 'none',
    }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : letter}
    </div>
  );
}

function FollowButton({ userId, isFollowing: initialFollowing, onToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setFollowing(initialFollowing); }, [initialFollowing]);

  async function toggle(e) {
    e.stopPropagation();
    if (!user?.email) { navigate('/signup'); return; }
    setLoading(true);
    const was = following;
    setFollowing(!was);
    try {
      if (was) { await api.delete(`/follows/${userId}`); }
      else { await api.post(`/follows/${userId}`); }
      lsSet(`follow_state_${userId}`, { following: !was });
      onToggle?.(!was);
    } catch {
      setFollowing(was);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={following ? 'btn btn-secondary' : 'btn btn-primary'}
      style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, flexShrink: 0, minWidth: 88, height: 34 }}
    >
      {loading ? '…' : following ? 'Unfollow' : 'Follow'}
    </button>
  );
}

function UserRow({ user: u, onFollowToggle, onNavigate }) {
  const { user: me } = useAuth();
  const name = u.display_name || u.username || `User #${u.anon_number}`;
  const cached = lsGet(`follow_state_${u.id}`);
  const initFollowing = cached?.following ?? u.is_following ?? false;

  return (
    <div
      onClick={() => onNavigate(u)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <UserAvatar url={u.avatar_url} name={name} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        {u.username && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>@{u.username}</div>
        )}
        {u.follower_count > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {u.follower_count === 1 ? '1 follower' : `${u.follower_count} followers`}
          </div>
        )}
      </div>
      {me?.email && me.id !== u.id && (
        <FollowButton
          userId={u.id}
          isFollowing={initFollowing}
          onToggle={(nowFollowing) => onFollowToggle?.(u.id, nowFollowing)}
        />
      )}
    </div>
  );
}

function RecentRow({ user: u, onNavigate, onRemove }) {
  const name = u.display_name || u.username || `User #${u.anon_number}`;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 20px',
        borderBottom: '1px solid var(--border)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        onClick={() => onNavigate(u)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}
      >
        <UserAvatar url={u.avatar_url} name={name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          {u.username && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>@{u.username}</div>
          )}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onRemove(u.id); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '4px 6px', flexShrink: 0 }}
        aria-label="Remove from recent"
      >×</button>
    </div>
  );
}

export default function FindFriends() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // On mount: restore active search only if we just came back from a profile
  const savedActive = (() => { try { return JSON.parse(sessionStorage.getItem(FF_ACTIVE_KEY)) || null; } catch { return null; } })();

  const [query, setQuery] = useState(savedActive?.query || '');
  const [users, setUsers] = useState(savedActive?.users || []);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(savedActive?.nextCursor || null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recentHistory, setRecentHistory] = useState(readHistory);

  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Flag: only true when we're navigating INTO a profile (not leaving the tab)
  const navigatingToProfileRef = useRef(false);

  // On unmount: clear active search cache unless we're going into a profile
  useEffect(() => {
    return () => {
      if (!navigatingToProfileRef.current) {
        try { sessionStorage.removeItem(FF_ACTIVE_KEY); } catch {}
      }
      navigatingToProfileRef.current = false;
    };
  }, []);

  const search = useCallback(async (q, cursor = null) => {
    if (!q.trim()) { setUsers([]); setNextCursor(null); return; }
    if (!cursor) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.get('/users/search', { params: { q: q.trim(), cursor, limit: 20 } });
      const { users: results, nextCursor: nc } = res.data;
      setUsers(prev => cursor ? [...prev, ...results] : results);
      setNextCursor(nc);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setUsers([]); setNextCursor(null); return; }
    debounceRef.current = setTimeout(() => search(q), 220);
  }

  function handleFollowToggle(userId, nowFollowing) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_following: nowFollowing } : u));
  }

  function handleNavigateToProfile(u) {
    // Mark that we're going into a profile so unmount keeps the active search
    navigatingToProfileRef.current = true;
    try { sessionStorage.setItem(FF_ACTIVE_KEY, JSON.stringify({ query, users, nextCursor })); } catch {}
    // Add to recent history
    addToHistory(u);
    setRecentHistory(readHistory());
    navigate(`/profile/${u.id}`);
  }

  function handleRemoveRecent(userId) {
    removeFromHistory(userId);
    setRecentHistory(readHistory());
  }

  function handleRecentTap(u) {
    // Tapping a recent = open their profile directly (also re-adds to top of history)
    handleNavigateToProfile(u);
  }

  function clearSearch() {
    setQuery('');
    setUsers([]);
    setNextCursor(null);
    try { sessionStorage.removeItem(FF_ACTIVE_KEY); } catch {}
    inputRef.current?.focus();
  }

  if (!user?.email) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <h3>Sign in to find friends</h3>
        <p>Create an account to search for friends and coworkers.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/signup')}>
          Sign In / Sign Up
        </button>
      </div>
    );
  }

  const showResults = query.trim().length > 0;
  const showRecent = !showResults && recentHistory.length > 0;

  return (
    <div ref={containerRef} style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px' }}>
        <h1 style={{ margin: '0 0 16px', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          Find Friends
        </h1>
        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInput}
            placeholder="Search by name or @username…"
            autoComplete="off"
            style={{
              width: '100%',
              padding: '11px 40px 11px 40px',
              borderRadius: 24,
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--purple)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {query && (
            <button
              onClick={clearSearch}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
            >×</button>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        {showResults ? (
          // ── Active search results ──
          loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : users.length > 0 ? (
            <>
              {users.map(u => (
                <UserRow key={u.id} user={u} onFollowToggle={handleFollowToggle} onNavigate={handleNavigateToProfile} />
              ))}
              {nextCursor && (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '8px 24px', fontSize: 13 }}
                    onClick={() => search(query, nextCursor)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>No users found</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>Try a different name or @username</p>
            </div>
          )
        ) : showRecent ? (
          // ── Recent searches ──
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 4px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent</span>
              <button
                onClick={() => { saveHistory([]); setRecentHistory([]); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--purple)', fontWeight: 600, padding: '2px 4px' }}
              >Clear all</button>
            </div>
            {recentHistory.map(u => (
              <RecentRow
                key={u.id}
                user={u}
                onNavigate={handleRecentTap}
                onRemove={handleRemoveRecent}
              />
            ))}
          </>
        ) : (
          // ── Empty default state ──
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Find people on Clocked</h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>Search by name or @username to find friends and coworkers</p>
          </div>
        )}
      </div>
    </div>
  );
}
