import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Renders the full contents of the three-dots dropdown menu.
// Used by both desktop topbar and mobile profile header.
export default function AccountSwitcherMenu({ onClose }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, logout, savedAccounts, switchToAccount } = useAuth();

  // Other saved accounts (not the current one)
  const otherAccounts = savedAccounts.filter(a => a.userId !== user?.id);

  async function handleSwitch(account) {
    onClose();
    await switchToAccount(account);
    navigate('/');
  }

  function handleAddAccount() {
    onClose();
    logout();
    navigate('/signup?mode=login');
  }

  function handleSignOut() {
    onClose();
    logout();
    navigate('/');
  }

  return (
    <>
      {/* Saved accounts — show when there are other accounts */}
      {otherAccounts.length > 0 && (
        <>
          <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Saved Accounts
          </div>
          {otherAccounts.map(account => (
            <button
              key={account.userId}
              className="topbar-dropdown-item"
              style={{ gap: 10, alignItems: 'center' }}
              onClick={() => handleSwitch(account)}
            >
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: account.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>
                {account.avatarUrl
                  ? <img src={account.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (account.displayName?.[0]?.toUpperCase() || '?')
                }
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {account.displayName}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {account.email}
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
          <div className="topbar-dropdown-divider" />
        </>
      )}

      {/* Current account section */}
      {user?.email && (
        <>
          <button className="topbar-dropdown-item" onClick={() => { onClose(); navigate('/profile'); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile
          </button>
          <button className="topbar-dropdown-item" onClick={() => { onClose(); navigate('/profile'); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
            Go Pro — $2.99/mo
          </button>
          <div className="topbar-dropdown-divider" />
        </>
      )}
      {!user?.email && (
        <>
          <button className="topbar-dropdown-item" onClick={() => { onClose(); navigate('/signup'); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Log In / Sign Up
          </button>
          <div className="topbar-dropdown-divider" />
        </>
      )}

      {/* Dark/light toggle */}
      <button className="topbar-dropdown-item" onClick={() => { toggle(); onClose(); }}>
        {theme === 'dark'
          ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>Light Mode</>
          : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>Dark Mode</>
        }
      </button>

      {/* Add / switch account */}
      <button className="topbar-dropdown-item" onClick={handleAddAccount}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7"/>
        </svg>
        {otherAccounts.length > 0 ? 'Add Another Account' : 'Switch Account'}
      </button>

      {/* Sign out */}
      {user?.email && (
        <>
          <div className="topbar-dropdown-divider" />
          <div style={{ padding: '6px 16px 2px', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
          <button className="topbar-dropdown-item" style={{ color: '#EF4444' }} onClick={handleSignOut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </>
      )}
    </>
  );
}
