import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding({ onDone }) {
  const navigate = useNavigate();

  function handleCreateAccount() {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onDone();
    navigate('/signup');
  }

  function handleBrowse() {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onDone();
    navigate('/');
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'var(--bg-primary)',
      textAlign: 'center',
    }}>
      {/* Logo */}
      <div style={{
        width: 72,
        height: 72,
        background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        boxShadow: '0 8px 24px rgba(168,85,247,0.35)',
      }}>
        <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>c</span>
      </div>

      {/* Wordmark */}
      <div style={{
        fontSize: 32,
        fontWeight: 800,
        color: 'var(--text-primary)',
        letterSpacing: '-0.5px',
        marginBottom: 12,
      }}>
        clocked
      </div>

      {/* Tagline */}
      <p style={{
        fontSize: 16,
        color: 'var(--text-muted)',
        marginBottom: 48,
        maxWidth: 260,
        lineHeight: 1.5,
      }}>
        Real reviews from real workers
      </p>

      {/* Buttons */}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          className="btn btn-primary btn-full"
          onClick={handleCreateAccount}
          style={{ fontSize: 16, padding: '14px 0' }}
        >
          Create Account
        </button>
        <button
          className="btn btn-secondary btn-full"
          onClick={handleBrowse}
          style={{ fontSize: 16, padding: '14px 0' }}
        >
          Browse Anonymously
        </button>
      </div>
    </div>
  );
}
