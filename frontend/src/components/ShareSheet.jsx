import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ─── Small helpers ────────────────────────────────────────────────────────────

function Avatar({ user, size = 52 }) {
  const label = user.display_name || user.username || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: user.avatar_url ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.38),
    }}>
      {user.avatar_url
        ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : label[0].toUpperCase()}
    </div>
  );
}

function StateOverlay({ status }) {
  if (!status) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      background: status === 'sent' ? 'rgba(34,197,94,0.88)' : 'rgba(0,0,0,0.38)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {status === 'sent' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <div className="spinner" style={{ width: 17, height: 17, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />
      )}
    </div>
  );
}

function ShareActionBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 15,
        background: active ? 'rgba(34,197,94,0.12)' : 'var(--bg-elevated)',
        border: `1.5px solid ${active ? '#22C55E' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, color: active ? '#22C55E' : 'var(--text-secondary)', fontWeight: 500, lineHeight: 1 }}>
        {label}
      </span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ShareSheet({ post, isOpen, onClose }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [mutuals, setMutuals] = useState([]);
  const [nonMutuals, setNonMutuals] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState({});
  const [linkCopied, setLinkCopied] = useState(false);

  const searchTimer = useRef(null);
  const inputRef = useRef(null);

  const shareUrl = `${window.location.origin}/post/${post?.id}`;
  const isSearching = query.trim().length > 0;
  const suggested = [...mutuals, ...nonMutuals];

  // ── Animate in / out
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // ── Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setQuery('');
        setSearchResults([]);
        setSentTo({});
        setLinkCopied(false);
      }, 300);
    }
  }, [isOpen]);

  // ── Fetch following + followers → compute mutuals
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    let cancelled = false;
    Promise.all([
      api.get(`/follows/${user.id}/following`),
      api.get(`/follows/${user.id}/followers`),
    ]).then(([fwRes, frRes]) => {
      if (cancelled) return;
      const following = Array.isArray(fwRes.data) ? fwRes.data : [];
      const followerIds = new Set((Array.isArray(frRes.data) ? frRes.data : []).map(u => u.id));
      setMutuals(following.filter(u => followerIds.has(u.id)).slice(0, 14));
      setNonMutuals(following.filter(u => !followerIds.has(u.id)).slice(0, 10));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, user?.id]);

  // ── Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
        const users = Array.isArray(res.data?.users) ? res.data.users.filter(u => u.id !== user?.id) : [];
        setSearchResults(users);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 260);
    return () => clearTimeout(searchTimer.current);
  }, [query, user?.id]);

  // ── Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const y = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, y);
    };
  }, [isOpen]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  // ── Send post to a user (mutual → direct DM, non-mutual → request — backend handles this automatically)
  async function handleSend(target) {
    if (sentTo[target.id]) return;
    setSentTo(prev => ({ ...prev, [target.id]: 'sending' }));
    try {
      await api.post(`/messages/${target.id}`, { body: shareUrl });
      setSentTo(prev => ({ ...prev, [target.id]: 'sent' }));
    } catch {
      setSentTo(prev => ({ ...prev, [target.id]: false }));
      addToast('Failed to send');
    }
  }

  // ── Copy link
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement('input');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setLinkCopied(true);
    addToast('Link copied');
    setTimeout(() => setLinkCopied(false), 2200);
  }

  // ── SMS — body only contains the URL
  function handleSMS() {
    window.open(`sms:?&body=${encodeURIComponent(shareUrl)}`, '_self');
  }

  // ── Mail — body only contains the URL
  function handleMail() {
    window.open(`mailto:?subject=${encodeURIComponent('Check this out on Clocked')}&body=${encodeURIComponent(shareUrl)}`, '_self');
  }

  // ── System share sheet — URL only
  async function handleMore() {
    if (navigator.share) {
      try { await navigator.share({ url: shareUrl }); } catch { /* cancelled */ }
    } else {
      handleCopy();
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.52)',
          zIndex: 2000,
          opacity: visible ? 1 : 0,
          transition: 'opacity 280ms ease',
        }}
      />

      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          marginLeft: 'auto', marginRight: 'auto',
          maxWidth: 480, zIndex: 2001,
          background: 'var(--bg-card)',
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -8px 48px rgba(0,0,0,0.22)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '88dvh', overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Title */}
        <div style={{ flexShrink: 0, textAlign: 'center', paddingBottom: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Share</span>
        </div>

        {/* ─── Scrollable area: search + people ─── */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '0 16px' }}>

          {/* Search bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'var(--bg-elevated)',
            border: '1.5px solid var(--border)',
            borderRadius: 13, padding: '10px 14px',
            marginBottom: 18,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search people..."
              autoComplete="off"
              autoCorrect="off"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 15, color: 'var(--text-primary)', fontFamily: 'inherit',
              }}
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', padding: 0, lineHeight: 1, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}
              >×</button>
            ) : null}
          </div>

          {/* ── Suggested people (no search) ── */}
          {!isSearching && (
            <>
              {suggested.length > 0 ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 13 }}>
                    Suggested
                  </div>
                  {/* Horizontal avatar row — mutuals appear first */}
                  <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 18, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {suggested.map(person => {
                      const status = sentTo[person.id];
                      return (
                        <button
                          key={person.id}
                          onClick={() => handleSend(person)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                            background: 'none', border: 'none', cursor: status === 'sent' ? 'default' : 'pointer',
                            flexShrink: 0, padding: '2px 0', minWidth: 56,
                          }}
                        >
                          <div style={{ position: 'relative' }}>
                            <Avatar user={person} size={52} />
                            <StateOverlay status={status} />
                          </div>
                          <span style={{
                            fontSize: 11, lineHeight: 1.3, textAlign: 'center',
                            maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: status === 'sent' ? '#22C55E' : 'var(--text-secondary)',
                            fontWeight: status === 'sent' ? 600 : 400,
                          }}>
                            {status === 'sent' ? 'Sent' : (person.display_name || person.username || 'User')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : user ? (
                <div style={{ padding: '4px 0 18px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Follow people to share posts with them instantly.
                </div>
              ) : (
                <div style={{ padding: '4px 0 18px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Sign in to share directly with people on Clocked.
                </div>
              )}
            </>
          )}

          {/* ── Search results (vertical list) ── */}
          {isSearching && (
            <div style={{ marginBottom: 10 }}>
              {searching ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <div className="spinner" />
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  No users found
                </div>
              ) : (
                searchResults.map(person => {
                  const status = sentTo[person.id];
                  return (
                    <div
                      key={person.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '9px 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <Avatar user={person} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {person.display_name || person.username}
                        </div>
                        {person.username && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{person.username}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleSend(person)}
                        disabled={!!status}
                        style={{
                          padding: '7px 18px', borderRadius: 20, border: 'none',
                          background: status === 'sent'
                            ? 'rgba(34,197,94,0.12)'
                            : status === 'sending'
                            ? 'var(--bg-elevated)'
                            : 'var(--purple)',
                          color: status === 'sent' ? '#22C55E' : status === 'sending' ? 'var(--text-muted)' : '#fff',
                          fontSize: 13, fontWeight: 600,
                          cursor: status ? 'default' : 'pointer',
                          flexShrink: 0, minWidth: 66,
                          transition: 'all 0.18s',
                        }}
                      >
                        {status === 'sending' ? '···' : status === 'sent' ? '✓ Sent' : 'Send'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ─── Bottom share actions — always pinned ─── */}
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          padding: '14px 20px',
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--bg-card)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>

            {/* Copy Link */}
            <ShareActionBtn
              active={linkCopied}
              label={linkCopied ? 'Copied!' : 'Copy Link'}
              onClick={handleCopy}
              icon={linkCopied
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
              }
            />

            {/* Messages (SMS) */}
            <ShareActionBtn
              label="Message"
              onClick={handleSMS}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              }
            />

            {/* Mail */}
            <ShareActionBtn
              label="Mail"
              onClick={handleMail}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              }
            />

            {/* More (system share) */}
            <ShareActionBtn
              label="More"
              onClick={handleMore}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5" cy="12" r="1.8" fill="var(--text-secondary)"/>
                  <circle cx="12" cy="12" r="1.8" fill="var(--text-secondary)"/>
                  <circle cx="19" cy="12" r="1.8" fill="var(--text-secondary)"/>
                </svg>
              }
            />

          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
