import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AccountAvatar({ url, name, size = 32 }) {
  const letter = (name || '?')[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: url ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff',
    }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : letter}
    </div>
  );
}

export default function AccountSwitcherMenu({ onClose }) {
  const navigate = useNavigate();
  const { user, logout, savedAccounts, switchToAccount } = useAuth();

  const otherAccounts = savedAccounts.filter(a => a.userId !== user?.id);

  async function handleSwitch(account) {
    onClose();
    await switchToAccount(account);
    navigate('/', { replace: true }); // replace so back button never restores old account
  }

  function handleAddAccount() {
    onClose();
    // Navigate to the dedicated switch-account page — does NOT sign out
    navigate('/switch-account');
  }

  function handleSignOut() {
    onClose();
    logout();
    navigate('/');
  }

  return (
    <div style={{ minWidth: 240 }}>
      {/* Active account row */}
      {user?.email && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          borderBottom: otherAccounts.length > 0 ? 'none' : '1px solid var(--border)',
        }}>
          <AccountAvatar url={user.avatar_url} name={user.display_name || user.email} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.display_name || user.username || user.email?.split('@')[0]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#A855F7',
            background: 'rgba(168,85,247,0.13)', borderRadius: 4,
            padding: '2px 7px', flexShrink: 0, letterSpacing: '0.3px',
          }}>Active</span>
        </div>
      )}

      {/* Saved accounts section */}
      {otherAccounts.length > 0 && (
        <>
          <div style={{
            padding: '8px 14px 4px',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            Saved Accounts
          </div>
          {otherAccounts.map(account => (
            <button
              key={account.userId}
              className="topbar-dropdown-item"
              onClick={() => handleSwitch(account)}
            >
              <AccountAvatar url={account.avatarUrl} name={account.displayName || account.email} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                  {account.displayName || account.email?.split('@')[0]}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {account.email}
                </div>
              </div>
            </button>
          ))}
          <div className="topbar-dropdown-divider" />
        </>
      )}

      {!otherAccounts.length && user?.email && (
        <div className="topbar-dropdown-divider" />
      )}

      {/* Menu items */}
      {user?.email ? (
        <button className="topbar-dropdown-item" onClick={() => { onClose(); navigate('/profile'); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Profile
        </button>
      ) : (
        <button className="topbar-dropdown-item" onClick={() => { onClose(); navigate('/signup'); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Log In / Sign Up
        </button>
      )}

      {/* Only show Add Account option when already signed in */}
      {user?.email && (
        <button className="topbar-dropdown-item" onClick={handleAddAccount}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7"/>
          </svg>
          Add Another Account
        </button>
      )}

      {user?.email && (
        <>
          <div className="topbar-dropdown-divider" />
          <button className="topbar-dropdown-item" style={{ color: '#EF4444' }} onClick={handleSignOut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </>
      )}
    </div>
  );
}
