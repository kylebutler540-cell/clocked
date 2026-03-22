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
      <div className="profile-avatar">👤</div>
      <div className="profile-username">{user?.email || username}</div>
      <div className="profile-subtitle">
        {isSubscribed ? (
          <span className="sub-badge">⭐ Pro Member</span>
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
                <span className="profile-menu-icon">⭐</span>
                Saved Reviews
              </div>
              <span className="profile-menu-arrow">›</span>
            </div>
            <div className="profile-menu-item" onClick={logout}>
              <div className="profile-menu-left">
                <span className="profile-menu-icon">🚪</span>
                Sign Out
              </div>
              <span className="profile-menu-arrow">›</span>
            </div>
          </>
        ) : (
          <div className="profile-menu-item" onClick={() => setShowLogin(true)}>
            <div className="profile-menu-left">
              <span className="profile-menu-icon">🔐</span>
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
            <span className="profile-menu-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
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
