import React, { useState, useEffect, useRef } from 'react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { lsGet, lsSet, lsDelete, lsClear } from '../lib/cache';
import Feed from '../components/Feed';
import PostCard from '../components/PostCard';
import EmployerSearch from '../components/EmployerSearch';
import BusinessLogo from '../components/BusinessLogo';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

function ProfileMenuSheet() {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState('main'); // 'main' | 'about'
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [closing, setClosing] = React.useState(false);
  const touchStartY = React.useRef(0);
  const sheetRef = React.useRef(null);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, logout, savedAccounts, switchToAccount } = useAuth();

  function close() {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setSwipeOffset(0);
      setView('main');
    }, 240);
  }

  function handleSignOut() {
    close();
    const remaining = (savedAccounts || []).filter(a => a.userId !== user?.id);
    logout();
    if (remaining.length > 0) navigate('/switch-account', { replace: true });
    else navigate('/signup', { replace: true });
  }

  async function handleSwitch(account) {
    close();
    await switchToAccount(account);
    navigate('/', { replace: true });
  }

  // Swipe-down to close
  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY;
    setSwipeOffset(0);
  }

  function handleTouchMove(e) {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setSwipeOffset(delta);
  }

  function handleTouchEnd() {
    if (swipeOffset > 80) {
      close();
    } else {
      setSwipeOffset(0);
    }
  }

  const sheetStyle = {
    maxWidth: 480,
    transform: closing
      ? 'translateY(100%)'
      : swipeOffset > 0
        ? `translateY(${swipeOffset}px)`
        : 'translateY(0)',
    transition: closing
      ? 'transform 0.24s cubic-bezier(0.4,0,0.6,1)'
      : swipeOffset > 0
        ? 'none'
        : 'transform 0.24s cubic-bezier(0,0,0.2,1)',
  };

  const otherAccounts = (savedAccounts || []).filter(a => a.userId !== user?.id);

  const ABOUT_ITEMS = [
    { label: 'Terms', path: '/terms' },
    { label: 'Privacy', path: '/privacy' },
    { label: 'Guidelines', path: '/community-guidelines' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, color: 'var(--text-primary)', borderRadius: 8, flexShrink: 0 }}
        aria-label="Menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="modal-overlay" onClick={close}>
          <div
            ref={sheetRef}
            className="modal-sheet"
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={sheetStyle}
          >
            <div className="modal-handle" />

            {view === 'about' ? (
              /* ── About sub-screen ── */
              <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
                <button
                  className="profile-sheet-item"
                  onClick={() => setView('main')}
                  style={{ color: 'var(--purple)', fontWeight: 600 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back
                </button>
                <div className="profile-sheet-divider" />
                <div style={{ padding: '8px 20px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  About
                </div>
                {ABOUT_ITEMS.map(item => (
                  <button
                    key={item.path}
                    className="profile-sheet-item"
                    onClick={() => { close(); setTimeout(() => navigate(item.path), 250); }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    {item.label}
                  </button>
                ))}
              </div>
            ) : (
              /* ── Main menu ── */
              <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>

                <button className="profile-sheet-item" onClick={() => { close(); navigate('/edit-profile'); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit Profile
                </button>

                <button className="profile-sheet-item" onClick={() => { close(); navigate('/saved'); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                  Saved Posts
                </button>

                <button className="profile-sheet-item" onClick={() => { close(); navigate('/find-friends'); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Find Friends
                </button>

                <button className="profile-sheet-item" onClick={() => { close(); navigate('/?sort=top'); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                  Top Rated
                </button>

                <div className="profile-sheet-divider" />

                <button className="profile-sheet-item" onClick={() => { toggle(); close(); }}>
                  {theme === 'dark' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                  )}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>

                <button className="profile-sheet-item" onClick={() => setView('about')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  About
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <div className="profile-sheet-divider" />

                {otherAccounts.length > 0 && (
                  <>
                    <div style={{ padding: '8px 20px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Switch Account
                    </div>
                    {otherAccounts.map(account => (
                      <button key={account.userId} className="profile-sheet-item" onClick={() => handleSwitch(account)}>
                        <AvatarCircle avatarUrl={account.avatarUrl} name={account.displayName || account.email} size={28} />
                        <span style={{ fontWeight: 600 }}>{account.displayName || account.email?.split('@')[0]}</span>
                      </button>
                    ))}
                    <div className="profile-sheet-divider" />
                  </>
                )}

                <button className="profile-sheet-item" onClick={() => { close(); navigate('/switch-account'); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7"/></svg>
                  Add Another Account
                </button>

                <div className="profile-sheet-divider" />

                <button className="profile-sheet-item profile-sheet-item-danger" onClick={handleSignOut}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>

              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Own Profile Hero ─────────────────────────────────────────────────────────
function OwnProfileHero({ user, ownDisplayName, isSubscribed, setUser, navigate, setFollowListModal, addToast }) {
  const [showJobSearch, setShowJobSearch] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  async function handleJobSelect(employer) {
    setSavingJob(true);
    setShowJobSearch(false);
    try {
      const res = await api.patch('/auth/profile', {
        workplace_name: employer.name,
        workplace_place_id: employer.place_id,
        workplace_address: employer.address || employer.description || '',
      });
      if (res.data.user && setUser) setUser(res.data.user);
    } catch {
      addToast('Failed to save job');
    } finally {
      setSavingJob(false);
    }
  }

  async function handleRemoveJob() {
    setShowJobSearch(false);
    try {
      const res = await api.patch('/auth/profile', { workplace_name: null, workplace_place_id: null, workplace_address: null });
      if (res.data.user && setUser) setUser(res.data.user);
    } catch { addToast('Failed to remove job'); }
  }

  const hasJob = !!user?.workplace_name;

  // Job picker: modal on mobile, dropdown on desktop
  const JobPicker = showJobSearch ? (
    isMobile ? (
      // ─ Mobile: centered overlay modal ─
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '18vh' }}
        onClick={() => setShowJobSearch(false)}
      >
        <div
          style={{ background: 'var(--bg-card)', borderRadius: 16, width: 'calc(100vw - 40px)', maxWidth: 360, boxShadow: '0 16px 48px rgba(0,0,0,0.25)', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Current Job</span>
            <button onClick={() => setShowJobSearch(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
          </div>
          <div style={{ padding: '0 10px 10px' }}>
            <EmployerSearch onSelect={handleJobSelect} placeholder="Search your employer..." />
          </div>
          {hasJob && (
            <button onClick={handleRemoveJob} style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#EF4444', fontWeight: 500 }}>
              Remove current job
            </button>
          )}
        </div>
      </div>
    ) : (
      // ─ Desktop: dropdown anchored to button ─
      <div className="profile-job-dropdown">
        <div style={{ padding: '10px 12px 4px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Job</div>
        <div style={{ padding: '0 8px 8px' }}>
          <EmployerSearch onSelect={handleJobSelect} placeholder="Search your employer..." />
        </div>
        {hasJob && (
          <button onClick={handleRemoveJob} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#EF4444', borderTop: '1px solid var(--border)' }}>
            Remove job
          </button>
        )}
      </div>
    )
  ) : null;

  return (
    <>
      {/* Layout:
          [+ create]  (mobile-only, top-left)
          [Avatar]  [Name] [+ job] [☰ menu]
                    @handle
                    Posts · Followers · Following
          [Bio]
          [Edit Profile]
      */}
      <div className="profile-hero-v2">
        {/* Mobile create button */}
        <button
          className="mobile-top-bar-btn mobile-top-bar-create profile-hero-create-btn"
          onClick={() => navigate('/create')}
          aria-label="Create post"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Left col: Avatar */}
        <div className="profile-hero-v2-left">
          <AvatarCircle avatarUrl={user?.avatar_url} name={ownDisplayName} size={72} />
        </div>

        {/* Right col: name row, handle, stats */}
        <div className="profile-hero-v2-right">
          {/* Name row: Name | + job | ☰ menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', minWidth: 0 }}>
            <span className="profile-username-large" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ownDisplayName}</span>

            {/* + Job button */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                className="profile-job-box"
                onClick={() => setShowJobSearch(v => !v)}
                title={hasJob ? user.workplace_name : 'Add current job'}
              >
                {hasJob ? (
                  <BusinessLogo placeId={user.workplace_place_id} name={user.workplace_name} size={36} borderRadius={8} />
                ) : (
                  <span className="profile-job-plus">
                    {savingJob
                      ? <div className="spinner" style={{ width: 14, height: 14 }} />
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    }
                  </span>
                )}
              </button>
              {/* Desktop dropdown anchored here */}
              {!isMobile && JobPicker}
            </div>

            {/* Hamburger menu (mobile only) */}
            <span className="mobile-only-menu" style={{ flexShrink: 0 }}><ProfileMenuSheet /></span>
          </div>

          {/* @username */}
          {user?.username && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>@{user.username}</div>
          )}

          {isSubscribed && <span className="sub-badge" style={{ marginTop: 6, display: 'inline-block' }}>✦ Pro Member</span>}

          {/* Stats: Posts · Followers · Following */}
          {user?.email && (
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                {formatCount(user?.post_count ?? 0)}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 3 }}>Post{user?.post_count !== 1 ? 's' : ''}</span>
              </span>
              <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }} onClick={() => setFollowListModal('followers')}>
                {formatCount(user?.follower_count)}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 3 }}>{user?.follower_count === 1 ? 'Follower' : 'Followers'}</span>
              </button>
              <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }} onClick={() => setFollowListModal('following')}>
                {formatCount(user?.following_count)}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 3 }}>Following</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bio — full-width below the two columns, left-aligned */}
      {user?.bio && (
        <div style={{ padding: '0 20px 8px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{user.bio}</p>
        </div>
      )}

      {/* Edit Profile — bottom-left */}
      {user?.email && (
        <div style={{ padding: '4px 20px 16px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '7px 16px', fontSize: 13 }}
            onClick={() => navigate('/edit-profile')}
          >
            Edit Profile
          </button>
        </div>
      )}

      {/* Mobile job picker modal (rendered at root level so it covers full screen) */}
      {isMobile && JobPicker}
    </>
  );
}

function formatCount(n) {
  if (n == null) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function AvatarCircle({ avatarUrl, name, size = 72 }) {
  const letter = name ? name[0].toUpperCase() : 'A';
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      fontSize: size * 0.38,
      fontWeight: 700,
      color: 'white',
      userSelect: 'none',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : letter
      }
    </div>
  );
}

function FollowListModal({ userId, type, onClose, onFollowChange }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // followStates: null = not loaded yet, true/false = known state
  const [followStates, setFollowStates] = useState({});

  useEffect(() => {
    async function load() {
      const cacheKey = `follows_${userId}_${type}`;
      // Show cached list instantly
      const cached = lsGet(cacheKey);
      if (cached) {
        setUsers(cached.users || []);
        setFollowStates(cached.states || {});
        setLoading(false);
      }
      try {
        const res = await api.get(`/follows/${userId}/${type}`);
        const list = Array.isArray(res.data) ? res.data : [];
        setUsers(list);
        if (currentUser?.email && list.length > 0) {
          const checks = await Promise.all(
            list.map(u =>
              u.id !== currentUser.id
                ? api.get(`/follows/${u.id}/is-following`).then(r => [u.id, r.data.following]).catch(() => [u.id, false])
                : Promise.resolve([u.id, null])
            )
          );
          const states = {};
          checks.forEach(([id, val]) => { if (val !== null) states[id] = val; });
          setFollowStates(states);
          lsSet(cacheKey, { users: list, states });
        } else {
          lsSet(cacheKey, { users: list, states: {} });
        }
      } catch {
        if (!cached) setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, type]); // eslint-disable-line

  async function toggleFollow(targetId, currentlyFollowing) {
    // Optimistic update
    setFollowStates(s => ({ ...s, [targetId]: !currentlyFollowing }));
    try {
      if (currentlyFollowing) {
        await api.delete(`/follows/${targetId}`);
      } else {
        await api.post(`/follows/${targetId}`);
      }
      onFollowChange?.();
    } catch {
      // Revert on error
      setFollowStates(s => ({ ...s, [targetId]: currentlyFollowing }));
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-handle" />
        <h2 className="modal-title" style={{ textTransform: 'capitalize' }}>{type}</h2>
        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
            {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
            {users.map(u => {
              // Use loaded state; while loading show nothing (null = not yet fetched)
              const isFollowing = followStates[u.id] ?? false;
              const name = u.display_name || 'Anonymous';
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => { onClose(); navigate(`/profile/${u.id}`); }}
                  >
                    <AvatarCircle avatarUrl={u.avatar_url} name={name} size={40} />
                  </div>
                  <div
                    style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                    onClick={() => { onClose(); navigate(`/profile/${u.id}`); }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    {u.username && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username}</div>}
                  </div>
                  {currentUser?.email && u.id !== currentUser.id && (
                    <button
                      className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
                      style={{ padding: '5px 14px', fontSize: 12, flexShrink: 0 }}
                      onClick={() => toggleFollow(u.id, isFollowing)}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="profile-empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <p className="profile-empty-text">{text}</p>
    </div>
  );
}

function TabSpinner() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
    </div>
  );
}

// Module-level cache for profile tab data — key → { data, ts }
const _profileTabCache = new Map();
const PROFILE_TAB_TTL = 5 * 60 * 1000;

function profileTabFresh(key) {
  const e = _profileTabCache.get(key);
  return e && (Date.now() - e.ts < PROFILE_TAB_TTL);
}

// Post list for posts/liked/disliked tabs
function UserPostList({ url, emptyState }) {
  const navigate = useNavigate();
  const entry = _profileTabCache.get(url);
  const fresh = profileTabFresh(url);
  const [posts, setPosts] = useState(fresh ? entry.data : []);
  const [loading, setLoading] = useState(!fresh);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (profileTabFresh(url)) {
      setPosts(_profileTabCache.get(url).data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(false);
    api.get(url)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        _profileTabCache.set(url, { data, ts: Date.now() });
        setPosts(data);
      })
      .catch(err => {
        if (err.response?.status === 401) setAuthError(true);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return <TabSpinner />;
  if (authError) return (
    <div className="profile-empty-state">
      <p className="profile-empty-text">Sign in to view this content.</p>
      <button
        className="btn btn-primary"
        style={{ marginTop: 16, padding: '9px 24px', fontSize: 14 }}
        onClick={() => navigate('/profile')}
      >
        Sign In
      </button>
    </div>
  );
  if (posts.length === 0) return emptyState || <EmptyState text="Nothing here yet." />;

  return (
    <div className="feed">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
        />
      ))}
    </div>
  );
}

// Comment history tab
function UserCommentList() {
  const fresh = profileTabFresh('comments');
  const [comments, setComments] = useState(fresh ? _profileTabCache.get('comments').data : []);
  const [loading, setLoading] = useState(!fresh);
  const navigate = useNavigate();

  useEffect(() => {
    if (profileTabFresh('comments')) {
      setComments(_profileTabCache.get('comments').data);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get('/posts/user/comments')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        _profileTabCache.set('comments', { data, ts: Date.now() });
        setComments(data);
      })
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSpinner />;
  if (comments.length === 0) return <EmptyState text="You haven't commented on any posts yet." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {comments.map(comment => (
        <div
          key={comment.id}
          style={{
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 20px',
            cursor: 'pointer',
          }}
          onClick={() => navigate(`/post/${comment.post_id}`)}
        >
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>
              on <strong style={{ color: 'var(--text-primary)' }}>{comment.post_employer_name || 'a post'}</strong>
              {comment.post_header && (
                <span style={{ color: 'var(--text-muted)' }}> — {comment.post_header}</span>
              )}
            </span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{comment.body}</p>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: viewingUserId } = useParams();
  const { user, loading: authInitializing, isSubscribed, login, register, loginWithGoogle, setUser } = useAuth();
  const { addToast } = useToast();
  // fromDM: the userId of the DM thread we came from (so back goes to that thread)
  const fromDM = location.state?.fromDM || null;
  const [activeTab, setActiveTab] = useState('posts');
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [publicUser, setPublicUser] = useState(null);
  const [publicUserLoading, setPublicUserLoading] = useState(true);
  // Seed follow state from cache immediately to avoid flash
  const [isFollowing, setIsFollowing] = useState(() => {
    if (!viewingUserId) return false;
    const cached = lsGet(`follow_state_${viewingUserId}`);
    return cached?.following ?? false;
  });
  const [followLoading, setFollowLoading] = useState(false);
  const [followListModal, setFollowListModal] = useState(null); // 'followers' | 'following' | null

  const isOwnProfile = !viewingUserId || viewingUserId === user?.id;

  // Refresh own user counts from server (to fix stale following_count)
  useEffect(() => {
    if (isOwnProfile && user?.email) {
      api.get('/auth/me')
        .then(res => { if (res.data?.user) setUser(res.data.user); })
        .catch(() => {});
    }
  }, [isOwnProfile]); // eslint-disable-line

  // For public profile (/profile/:userId)
  useEffect(() => {
    if (viewingUserId && !isOwnProfile) {
      // Show cached profile instantly, fetch fresh in background
      const profileKey = `profile_${viewingUserId}`;
      const cached = lsGet(profileKey);
      if (cached) {
        setPublicUser(cached);
        setPublicUserLoading(false);
      } else {
        setPublicUserLoading(true);
      }
      api.get(`/auth/user/${viewingUserId}`)
        .then(res => {
          setPublicUser(res.data);
          lsSet(profileKey, res.data);
        })
        .catch(() => {})
        .finally(() => setPublicUserLoading(false));

      if (user?.email) {
        api.get(`/follows/${viewingUserId}/is-following`)
          .then(res => {
            setIsFollowing(res.data.following);
            lsSet(`follow_state_${viewingUserId}`, { following: res.data.following });
          })
          .catch(() => {});
      }
    }
  }, [viewingUserId, isOwnProfile, user?.email]);

  

  async function handleAuth(e) {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
        addToast('Account created!');
      } else {
        await login(email, password);
        addToast('Logged in!');
      }
      setShowLogin(false);
    } catch (err) {
      addToast(err.response?.data?.error || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleFollow() {
    if (!user?.email) return navigate('/signup');
    setFollowLoading(true);
    // Optimistic UI update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setPublicUser(u => u ? { ...u, follower_count: (u.follower_count || 0) + (wasFollowing ? -1 : 1) } : u);
    // Optimistically update own following_count in context
    setUser({ ...user, following_count: (user.following_count || 0) + (wasFollowing ? -1 : 1) });
    try {
      if (wasFollowing) {
        const res = await api.delete(`/follows/${viewingUserId}`);
        setPublicUser(u => u ? { ...u, follower_count: res.data.follower_count } : u);
      } else {
        const res = await api.post(`/follows/${viewingUserId}`);
        setPublicUser(u => u ? { ...u, follower_count: res.data.follower_count } : u);
      }
      // Refresh own user from server to get accurate following_count
      api.get('/auth/me').then(r => { if (r.data?.user) setUser(r.data.user); }).catch(() => {});
      // Cache new follow state so next visit loads instantly with correct button
      lsSet(`follow_state_${viewingUserId}`, { following: !wasFollowing });
      // Invalidate cached profile so next visit shows fresh count
      lsDelete(`profile_${viewingUserId}`);
      lsClear(`follows_${viewingUserId}`);
    } catch {
      // Revert optimistic updates
      setIsFollowing(wasFollowing);
      lsSet(`follow_state_${viewingUserId}`, { following: wasFollowing });
      setPublicUser(u => u ? { ...u, follower_count: (u.follower_count || 0) + (wasFollowing ? 1 : -1) } : u);
      setUser({ ...user, following_count: (user.following_count || 0) + (wasFollowing ? 1 : -1) });
      addToast('Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  }

  const ownDisplayName = user?.display_name || user?.username || 'Anonymous';
  const ownAvatarLetter = ownDisplayName[0]?.toUpperCase() || 'A';

  const postsEmptyState = (
    <div className="profile-empty-state">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <p className="profile-empty-title">You haven't made any posts yet.</p>
      <p className="profile-empty-text">Create your first post and share your experience anonymously.</p>
      <button
        className="btn btn-primary"
        style={{ marginTop: 20, padding: '11px 24px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        onClick={() => navigate('/create')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Create Post
      </button>
    </div>
  );

  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'comments', label: 'Comments' },
    { id: 'liked', label: 'Liked' },
    { id: 'disliked', label: 'Disliked' },
  ];

  // While auth is initializing, show a neutral loading state to prevent signed-out flash
  if (authInitializing) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  // Public profile view (viewing another user's profile)
  if (!isOwnProfile) {
    // Hold until profile data is loaded — prevents anonymous/0-followers flash
    if (publicUserLoading) {
      return (
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      );
    }

    const pubName = publicUser?.display_name || 'Anonymous';
    return (
      <div className="profile-page">
        {/* Profile hero: avatar left, info right, buttons below */}
        <div style={{ padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top row: avatar + name/handle/counts */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <AvatarCircle avatarUrl={publicUser?.avatar_url} name={pubName} size={72} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 4, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pubName}</div>
              {publicUser?.username && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>@{publicUser.username}</div>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <button
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setFollowListModal('followers')}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCount(publicUser?.follower_count)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>{publicUser?.follower_count === 1 ? 'Follower' : 'Followers'}</span>
                </button>
                <button
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setFollowListModal('following')}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCount(publicUser?.following_count)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>Following</span>
                </button>
              </div>
            </div>
          </div>
          {/* Buttons below — wider, shorter */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{ flex: 1, padding: '8px 0', fontSize: 14, fontWeight: 600, height: 36 }}
              onClick={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px 0', fontSize: 14, fontWeight: 600, height: 36 }}
              onClick={() => user?.email ? navigate('/messages?user=' + viewingUserId) : navigate('/signup')}
            >
              Message
            </button>
          </div>
        </div>
        <UserPostList url={`/posts/user/${viewingUserId}/posts`} emptyState={<EmptyState text="This user hasn't posted anything yet." />} />
        {followListModal && (
          <FollowListModal
            userId={viewingUserId}
            type={followListModal}
            onClose={() => setFollowListModal(null)}
            onFollowChange={() => {
              // Refresh current user's following_count and public user's follower_count
              api.get('/auth/me').then(r => { if (r.data?.user) setUser(r.data.user); }).catch(() => {});
              api.get(`/auth/user/${viewingUserId}`).then(r => setPublicUser(r.data)).catch(() => {});
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="profile-page">

      {/* Hero: avatar + info */}
      {!user?.email ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 24px', textAlign: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 20 }}>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You're not signed in</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28, maxWidth: 320 }}>
            Sign in to manage your profile, posts, and reviews.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: '11px 32px', fontSize: 15, fontWeight: 700 }}
            onClick={() => navigate('/signup?mode=login')}
          >
            Sign In / Create Account
          </button>
        </div>
      ) : (
        <OwnProfileHero
          user={user}
          ownDisplayName={ownDisplayName}
          isSubscribed={isSubscribed}
          setUser={setUser}
          navigate={navigate}
          setFollowListModal={setFollowListModal}
          addToast={addToast}
        />
      )}

      {user?.email && (
        <>
          {/* Tab bar */}
          <div className="profile-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`profile-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'posts' && (
            <UserPostList url="/posts/user/posts" emptyState={postsEmptyState} />
          )}

          {activeTab === 'comments' && (
            <UserCommentList />
          )}

          {activeTab === 'liked' && (
            <UserPostList url="/posts/user/liked" user={user} />
          )}

          {activeTab === 'disliked' && (
            <UserPostList url="/posts/user/disliked" user={user} />
          )}
        </>
      )}

      {/* Auth modal */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">{isRegister ? 'Create Account' : 'Sign In'}</h2>
            <p className="modal-subtitle">
              {isRegister
                ? 'Save reviews, get notifications, and manage your subscription.'
                : 'Welcome back.'}
            </p>

            <GoogleSignInButton
              label="Sign in with Google"
              style={{ marginBottom: 16 }}
              onCredential={async (credential) => {
                try {
                  await loginWithGoogle(credential);
                  setShowLogin(false);
                } catch (err) {
                  addToast(err?.response?.data?.error || 'Google sign-in failed. Please try again.');
                }
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={authLoading}
              >
                {authLoading ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <button
              className="btn btn-ghost btn-full"
              style={{ marginTop: 8 }}
              onClick={() => setIsRegister(r => !r)}
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      )}

      {followListModal && (
        <FollowListModal
          userId={user?.id}
          type={followListModal}
          onClose={() => setFollowListModal(null)}
          onFollowChange={() => {
            // Refresh own user to get accurate follower/following counts
            api.get('/auth/me').then(r => { if (r.data?.user) setUser(r.data.user); }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
