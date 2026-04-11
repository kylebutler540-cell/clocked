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

  // Load Google Identity Services
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      window.google?.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'pill',
        }
      );
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
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

      {/* Google Sign In */}
      <div id="google-signin-btn" style={{ marginBottom: 20, width: '100%' }} />

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

