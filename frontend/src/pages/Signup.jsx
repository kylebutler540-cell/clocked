import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return addToast('Email and password required');
    if (password.length < 8) return addToast('Password must be at least 8 characters');

    setSubmitting(true);
    try {
      await register(email, password);
      addToast('Account created!');
      navigate('/');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: 400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
        Create Account
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
        Join Clocked to save reviews and get notified.
      </p>

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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting}
          style={{ marginTop: 8 }}
        >
          {submitting ? 'Creating...' : 'Create Account'}
        </button>
      </form>

      <button
        className="btn btn-ghost btn-full"
        onClick={() => navigate('/')}
        style={{ marginTop: 12 }}
      >
        Skip for now
      </button>
    </div>
  );
}
