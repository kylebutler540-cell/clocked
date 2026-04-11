import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Default to login mode if ?mode=login is in the URL
  const [mode, setMode] = useState(() => searchParams.get('mode') === 'login' ? 'login' : 'signup');
  const { register, login, loginWithGoogle } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Load Google Identity Services — for callback only, custom button handles UI
  useEffect(() => {
    function init() {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
    }
    if (window.google) { init(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  async function handleGoogleCredential(response) {
    try {
      const data = await loginWithGoogle(response.credential);
      if (!data.user?.username) {
        navigate('/profile-setup');
      } else {
        navigate('/');
      }
    } catch (err) {
      addToast(err?.response?.data?.error || 'Google sign-in failed. Please try again.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return addToast('Email and password required');
    if (mode === 'signup' && password.length < 8) return addToast('Password must be at least 8 characters');

    setSubmitting(true);
    try {
      let data;
      if (mode === 'signup') {
        data = await register(email, password);
        addToast('Account created!');
      } else {
        data = await login(email, password);
        addToast('Logged in!');
      }
      if (!data.user?.username) {
        navigate('/profile-setup');
      } else {
        navigate('/');
      }
    } catch (err) {
      if (err.response?.data?.googleOnly) {
        addToast('This account uses Google sign-in. Please use "Continue with Google" instead.');
      } else {
        addToast(err.response?.data?.error || (mode === 'signup' ? 'Failed to create account' : 'Incorrect email or password'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page-wrapper">
    <div className="auth-page-card">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
        {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
        {mode === 'signup' ? 'Join Clocked — it\'s free.' : 'Sign in to your Clocked account.'}
      </p>

      {/* Custom Google button — clean pill, no "Continue as" text */}
      <button
        type="button"
        onClick={() => window.google?.accounts.id.prompt()}
        className="btn btn-secondary btn-full"
        style={{ borderRadius: 24, padding: '12px 20px', fontSize: 14, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or continue with email</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'signup' ? 8 : 1}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting}
          style={{ marginTop: 8 }}
        >
          {submitting ? (mode === 'signup' ? 'Creating...' : 'Signing in...') : (mode === 'signup' ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      <button
        className="btn btn-ghost btn-full"
        onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
        style={{ marginTop: 12 }}
      >
        {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
      </button>

      <button
        className="btn btn-ghost btn-full"
        onClick={() => navigate('/')}
        style={{ marginTop: 4, fontSize: 13 }}
      >
        Skip for now
      </button>
    </div>
    </div>
  );
}

