import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { generateAnonName } from '../lib/utils';
import api from '../lib/api';

export default function Profile() {
  const { user, logout, isSubscribed } = useAuth();
  const { theme, toggle } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const { login, register } = useAuth();

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

  async function handleSubscribe() {
    try {
      const res = await api.post('/subscriptions/checkout');
      if (res.data.url) window.location.href = res.data.url;
      else addToast('Payments not configured yet');
    } catch {
      addToast('Failed to start checkout');
    }
  }

  const username = user ? generateAnonName(user.id) : 'Anonymous';

  return (
    <div className="profile-page" style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div className="profile-avatar">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div className="profile-username">{user?.email || username}</div>
      <div className="profile-subtitle">
        {isSubscribed ? (
          <span className="sub-badge">✦ Pro Member</span>
        ) : (
          'Anonymous member'
        )}
      </div>

      {/* Subscription */}
      {!isSubscribed && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
          border: '1px solid rgba(168,85,247,0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
            🔓 Unlock Full Reviews
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            $2.99/month — 7-day free trial
          </div>
          <button className="btn btn-primary" onClick={handleSubscribe} style={{ padding: '10px 18px' }}>
            Start Free Trial
          </button>
        </div>
      )}

      {/* Account section */}
      <div className="profile-section">
        <div className="profile-section-title">Account</div>

        {user?.email ? (
          <>
            <div className="profile-menu-item" onClick={() => navigate('/saved')}>
              <div className="profile-menu-left">
                <span className="profile-menu-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </span>
                Saved Reviews
              </div>
              <span className="profile-menu-arrow">›</span>
            </div>
            <div className="profile-menu-item" onClick={logout}>
              <div className="profile-menu-left">
                <span className="profile-menu-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </span>
                Sign Out
              </div>
              <span className="profile-menu-arrow">›</span>
            </div>
          </>
        ) : (
          <div className="profile-menu-item" onClick={() => setShowLogin(true)}>
            <div className="profile-menu-left">
              <span className="profile-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              </span>
              Create Account / Sign In
            </div>
            <span className="profile-menu-arrow">›</span>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="profile-section">
        <div className="profile-section-title">Settings</div>

        <div className="profile-menu-item" onClick={toggle}>
          <div className="profile-menu-left">
            <span className="profile-menu-icon">
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </span>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>
      </div>

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
    </div>
  );
}
