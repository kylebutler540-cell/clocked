import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

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
  const { user, savedAccounts, switchToAccount, loginWithGoogle, login } = useAuth();
  const { addToast } = useToast();
  const [switching, setSwitching] = useState(null);
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // When signed out (user=null), all saved accounts are available to switch into
  const otherAccounts = savedAccounts.filter(a => a.userId !== user?.id);



  async function handleSwitch(account) {
    setSwitching(account.userId);
    try {
      await switchToAccount(account);
      navigate('/', { replace: true }); // replace so back button never returns to switch screen
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
      if (!data.user?.username) navigate('/profile-setup', { replace: true });
      else navigate('/', { replace: true });
    } catch (err) {
      addToast(err?.response?.data?.error || 'Incorrect email or password');
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = user?.display_name || user?.username || user?.email?.split('@')[0] || 'My Account';

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '0 20px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 4px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px 8px 4px 0', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
          {user?.email ? 'Switch Account' : 'Sign In'}
        </h1>
      </div>

      {/* Current account — only show when signed in */}
      {user?.email && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Current Account</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: 'rgba(168,85,247,0.08)', border: '1.5px solid rgba(168,85,247,0.25)' }}>
            <AccountAvatar url={user?.avatar_url} name={displayName} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#A855F7', background: 'rgba(168,85,247,0.15)', borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>Active</span>
          </div>
        </div>
      )}

      {/* Other saved accounts */}
      {otherAccounts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{user?.email ? 'Saved Accounts' : 'Your Accounts'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {otherAccounts.map(account => (
              <button key={account.userId} onClick={() => handleSwitch(account)} disabled={!!switching}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', width: '100%', opacity: switching && switching !== account.userId ? 0.5 : 1, WebkitTapHighlightColor: 'transparent' }}>
                <AccountAvatar url={account.avatarUrl} name={account.displayName || account.email} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.displayName || account.email?.split('@')[0]}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.email}</div>
                </div>
                {switching === account.userId
                  ? <div className="spinner" style={{ width: 18, height: 18, flexShrink: 0 }} />
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
                }
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add another account */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Add Another Account</div>

        <GoogleSignInButton
          label="Sign in with Google"
          style={{ marginBottom: 10 }}
          onCredential={async (credential) => {
            try {
              const data = await loginWithGoogle(credential);
              if (!data.user?.username) navigate('/profile-setup', { replace: true });
              else navigate('/', { replace: true }); // replace so back never returns to switch screen
            } catch (err) {
              addToast(err?.response?.data?.error || 'Google sign-in failed.');
            }
          }}
        />

        {/* Email */}
        {!showAddEmail ? (
          <button onClick={() => setShowAddEmail(true)} className="btn btn-secondary btn-full" style={{ borderRadius: 24, padding: '12px', fontSize: 14, fontWeight: 600 }}>
            Sign in with Email
          </button>
        ) : (
          <form onSubmit={handleEmailAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required autoFocus />
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required />
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting} style={{ borderRadius: 24 }}>{submitting ? 'Signing in...' : 'Sign In'}</button>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => setShowAddEmail(false)}>Cancel</button>
          </form>
        )}
      </div>
    </div>
  );
}
