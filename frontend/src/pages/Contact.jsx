import React from 'react';

const CONTACT_EMAIL = 'clockedsupport@gmail.com';

export default function Contact() {
  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 20px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Contact Us</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>We'd love to hear from you.</p>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '28px 24px',
        marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>General Support</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          For questions, feedback, or account issues, reach out via email and we'll get back to you as soon as possible.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          style={{
            display: 'inline-block',
            background: 'var(--purple)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 10,
            padding: '10px 22px',
            textDecoration: 'none',
          }}
        >
          {CONTACT_EMAIL}
        </a>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '28px 24px',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Report Content</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          If you see content that violates our{' '}
          <a href="/community-guidelines" style={{ color: 'var(--purple)', textDecoration: 'none', fontWeight: 600 }}>Community Guidelines</a>,
          {' '}use the report button on the post or email us directly with details.
        </p>
      </div>
    </div>
  );
}
