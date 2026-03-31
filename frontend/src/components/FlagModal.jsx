import React, { useState } from 'react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const REASONS = [
  "I don't like it",
  'Spam or fake review',
  'Harassment or hate speech',
  'Personal information exposed',
  'Irrelevant content',
  'Explicit material',
  'Other',
];

export default function FlagModal({ postId, onClose }) {
  const [reason, setReason] = useState('');
  const [otherText, setOtherText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();

  async function handleSubmit() {
    if (!reason) return;
    const finalReason = reason === 'Other' && otherText.trim()
      ? `Other: ${otherText.trim()}`
      : reason;
    setSubmitting(true);
    try {
      await api.post(`/posts/${postId}/flag`, { reason: finalReason });
      setSubmitted(true);
    } catch {
      addToast('Failed to report post');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = reason && (reason !== 'Other' || otherText.trim().length > 0);

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }}>
        <div
          className="modal-sheet"
          onClick={e => e.stopPropagation()}
          style={{ textAlign: 'center', padding: '32px 24px 28px' }}
        >
          {/* Close X top right */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Animated green checkmark */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            animation: 'scaleIn 0.2s ease',
            boxShadow: '0 4px 20px rgba(34,197,94,0.35)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
            Report Submitted
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Your report has been submitted successfully, and our team is working to resolve the issue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">Report Post</h2>
        <p className="modal-subtitle">Why are you reporting this post?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {REASONS.map(r => (
            <React.Fragment key={r}>
              <button
                style={{
                  padding: '12px 14px',
                  background: reason === r ? 'var(--purple-glow)' : 'var(--bg-input)',
                  border: `1px solid ${reason === r ? 'var(--purple)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  transition: 'all var(--transition)',
                }}
                onClick={() => setReason(r)}
              >
                {r}
              </button>
              {r === 'Other' && reason === 'Other' && (
                <textarea
                  autoFocus
                  placeholder="Describe the reason..."
                  value={otherText}
                  onChange={e => setOtherText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--purple)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
