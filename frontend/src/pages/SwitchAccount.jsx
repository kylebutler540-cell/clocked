import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

function AccountAvatar({ url, name, size = 48 }) {
  const letter = (name || '?')[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: url ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff', userSelect: 'none',
    }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : letter}
    </div>
  );
}

export default function SwitchAccount() {
  const navigate = useNavigate();
  const { user, savedAccounts, switchToAccount, loginWithGoogle, login, register } = useAuth();
  const { addToast } = useToast();
  const [switching, setSwitching] = useState(null); // userId being switched to
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Accounts other than current
  const otherAccounts = savedAccounts.filter(a => a.userId !== user?.id);

  // Mount GSI button with select_account hint
  useEffect(() => {
    function init() {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const data = await loginWithGoogle(response.credential);
            if (!data.user?.username) navigate('/profile-setup');
            else navigate('/');
          } catch (err) {
            addToast(err?.response?.data?.error || 'Google sign-in failed.');
          }
        },
      });
      window.google?.accounts.id.renderButton(
        document.getElementById('switch-google-btn'),
        { theme: 'outline', size: 'large', width: 320, text: 'signin_with', shape: 'pill' }
      );
    }
    if (window.google) { init(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  async function handleSwitch(account) {
    setSwitching(account.userId);
    try {
      await switchToAccount(account);
      navigate('/');
    } catch {
      addToast('Failed to switch account');
      setSwitching(null);
    }
  }

  async function handleEmailAdd(e) {
    e.preventDefault();
    if (!email || !password) return addToast('Email and password required');
    setSubmitting(true);
    try {
      const data = await login(email, password);
      if (!data.user?.username) navigate('/profile-setup');
      else navigate('/');
    } catch (err) {
      addToast(err?.response?.data?.error || 'Incorrect email or password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 0' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Switch Account</h1>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Current active account */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Current Account
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 14,
            background: 'rgba(168,85,247,0.08)',
            border: '1.5px solid rgba(168,85,247,0.25)',
          }}>
            <AccountAvatar url={user?.avatar_url} name={user?.display_name || user?.email} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.display_name || user?.username || user?.email?.split('@')[0] || 'My Account'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#A855F7', background: 'rgba(168,85,247,0.15)', borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>
              Active
            </span>
          </div>
        </div>

        {/* Other saved accounts */}
        {otherAccounts.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Saved Accounts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {otherAccounts.map(account => (
                <button
                  key={account.userId}
                  onClick={() => handleSwitch(account)}
                  disabled={switching === account.userId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '13px 16px', borderRadius: 14,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                    WebkitTapHighlightColor: 'transparent', width: '100%',
                    opacity: switching && switching !== account.userId ? 0.5 : 1,
                  }}
                >
                  <AccountAvatar url={account.avatarUrl} name={account.displayName || account.email} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {account.displayName || account.email?.split('@')[0]}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {account.email}
                    </div>
                  </div>
                  {switching === account.userId
                    ? <div className="spinner" style={{ width: 18, height: 18, flexShrink: 0 }} />
                    : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )
                  }
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add another account */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Add Another Account
          </div>

          {/* Custom Google button — opens Google account picker, no "Continue as" */}
          {/* Real GSI button — clickable, styled to match app */}
          <div style={{ marginBottom: 10, borderRadius: 24, overflow: 'hidden' }}>
            <div id="switch-google-btn" style={{ width: '100%' }} />
          </div>

          {/* Email option toggle */}
          {!showAddEmail ? (
            <button
              onClick={() => setShowAddEmail(true)}
              className="btn btn-secondary btn-full"
              style={{ borderRadius: 24, padding: '12px', fontSize: 14, fontWeight: 600 }}
            >
              Sign in with Email
            </button>
          ) : (
            <form onSubmit={handleEmailAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                required
                autoFocus
              />
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
              />
              <button type="submit" className="btn btn-primary btn-full" disabled={submitting} style={{ borderRadius: 24 }}>
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
              <button type="button" className="btn btn-ghost btn-full" onClick={() => setShowAddEmail(false)}>
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
