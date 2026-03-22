import React, { useState } from 'react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function PaywallModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await api.post('/subscriptions/checkout');
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        addToast('Payments not configured yet');
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        <div style={{ marginBottom: 12, textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
        <h2 className="modal-title" style={{ textAlign: 'center' }}>Unlock Full Reviews</h2>
        <p className="modal-subtitle" style={{ textAlign: 'center' }}>
          Read uncensored reviews from real workers. No BS, no fluff — just the truth about your employer.
        </p>

        <div className="pricing-card">
          <div className="pricing-badge">7-Day Free Trial</div>
          <div className="pricing-price">$2.99 <span>/ month</span></div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Cancel anytime. No commitment.
          </p>
          <ul className="pricing-features">
            <li><span className="check">✓</span> Full review text — no blurring</li>
            <li><span className="check">✓</span> Unlimited saves & searches</li>
            <li><span className="check">✓</span> Priority support</li>
            <li><span className="check">✓</span> Help workers share their stories</li>
          </ul>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Start Free Trial'}
        </button>

        <button
          className="btn btn-ghost btn-full"
          style={{ marginTop: 8 }}
          onClick={onClose}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
