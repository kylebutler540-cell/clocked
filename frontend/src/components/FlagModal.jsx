import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const REASONS = [
  "I Don't Like It",
  'Spam / Fake Review',
  'Harassment or Hate Speech',
  'Personal Information Exposed',
  'Irrelevant Content',
  'Explicit Material',
  'Other',
];

export default function FlagModal({ postId, postAuthor, postUrl, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();
  const detailsRef = useRef(null);

  const resolvedUrl = postUrl || `${window.location.origin}/post/${postId}`;
  const resolvedAuthor = postAuthor || 'Anonymous';

  function handleReasonSelect(r) {
    setReason(r);
    if (r === 'Other') {
      setTimeout(() => {
        detailsRef.current?.focus();
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  async function handleSubmit() {
    if (!reason || submitting) return;
    const fullReason = `${reason}${details.trim() ? `\n\nPost Author: ${resolvedAuthor}\nPost Link: ${resolvedUrl}\n\nAdditional Details:\n${details.trim()}` : `\n\nPost Author: ${resolvedAuthor}\nPost Link: ${resolvedUrl}`}`;
    setSubmitting(true);
    try {
      await api.post(`/posts/${postId}/flag`, { reason: fullReason });
      setSubmitted(true);
    } catch {
      addToast('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '40px 24px 32px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Report Submitted</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Thanks for keeping Clocked safe. Our team will review this report.
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

        {/* Email-style header */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 16,
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, width: 52, flexShrink: 0 }}>To</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>clockedreports@gmail.com</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '9px 12px' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, width: 52, flexShrink: 0 }}>Subject</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Reported Post - Clocked App</span>
          </div>
        </div>

        {/* Reason buttons */}
        <p className="modal-subtitle" style={{ marginBottom: 10 }}>Select a reason</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => handleReasonSelect(r)}
              style={{
                padding: '10px 14px',
                background: reason === r ? 'var(--purple-glow)' : 'var(--bg-input)',
                border: `1px solid ${reason === r ? 'var(--purple)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                fontSize: 14,
                fontWeight: reason === r ? 600 : 400,
                color: reason === r ? 'var(--purple)' : 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Additional details */}
        <textarea
          ref={detailsRef}
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder={reason ? 'Additional details (optional)…' : 'Select a reason above…'}
          readOnly={!reason}
          style={{
            width: '100%',
            minHeight: 80,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: reason ? 'var(--bg-input)' : 'var(--bg-elevated)',
            color: reason ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 13,
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 14,
            fontFamily: 'inherit',
          }}
        />

        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={!reason || submitting}
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
