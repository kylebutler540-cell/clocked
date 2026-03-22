import React, { useState } from 'react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const REASONS = [
  'Spam or fake review',
  'Harassment or hate speech',
  'Personal information exposed',
  'Irrelevant content',
  'Other',
];

export default function FlagModal({ postId, onClose }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    try {
      await api.post(`/posts/${postId}/flag`, { reason });
      addToast('Post reported. Thank you.');
      onClose();
    } catch {
      addToast('Failed to report post');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">Report Post</h2>
        <p className="modal-subtitle">Why are you reporting this post?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {REASONS.map(r => (
            <button
              key={r}
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
          ))}
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={!reason || submitting}
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
