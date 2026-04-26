import React from 'react';

export default function DailyPrompts() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: 'rgba(168,85,247,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
        Daily Prompts
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 320, lineHeight: 1.6 }}>
        Coming soon — daily workplace questions, honest answers, and real talk from people just like you.
      </p>
    </div>
  );
}
