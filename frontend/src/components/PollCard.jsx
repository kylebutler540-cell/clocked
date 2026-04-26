import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { seedPoll, getVotedPoll, recordVote, subscribePoll } from '../lib/pollStore';

export default function PollCard({ poll: initialPoll }) {
  useEffect(() => {
    if (initialPoll?.id) seedPoll(initialPoll.id, initialPoll);
  }, [initialPoll?.id]); // eslint-disable-line

  const [poll, setPoll] = useState(() => {
    if (!initialPoll?.id) return initialPoll;
    const stored = getVotedPoll(initialPoll.id);
    if (stored?.user_voted_option_id) return stored;
    return initialPoll;
  });

  // pending = option the user has tapped but vote not yet committed
  const [pendingOptionId, setPendingOptionId] = useState(null);
  const [committing, setCommitting] = useState(false);
  const debounceRef = useRef(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Subscribe to cross-feed vote updates
  useEffect(() => {
    if (!initialPoll?.id) return;
    const unsub = subscribePoll(initialPoll.id, (updated) => {
      setPoll(updated);
      setPendingOptionId(null);
    });
    return unsub;
  }, [initialPoll?.id]); // eslint-disable-line

  // Sync if feed refreshes with a voted state
  useEffect(() => {
    if (!initialPoll?.id) return;
    if (initialPoll.user_voted_option_id && !poll.user_voted_option_id) {
      setPoll(initialPoll);
      recordVote(initialPoll.id, initialPoll);
    }
  }, [initialPoll?.user_voted_option_id]); // eslint-disable-line

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  if (!poll) return null;

  const hasVoted = !!poll.user_voted_option_id;
  const total = poll.total_votes != null
    ? poll.total_votes
    : poll.options.reduce((s, o) => s + (o.vote_count ?? 0), 0);

  function handleSelect(optionId) {
    if (hasVoted || committing) return;
    if (!user?.email) { navigate('/signup'); return; }

    // Update pending selection immediately (user can change mind)
    setPendingOptionId(optionId);

    // Reset debounce — commit after 1.5s of no changes
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitVote(optionId), 1500);
  }

  async function commitVote(optionId) {
    if (committing) return;
    setCommitting(true);
    try {
      const res = await api.post(`/polls/${poll.id}/vote`, { optionId });
      const updated = res.data;
      setPoll(updated);
      setPendingOptionId(null);
      recordVote(poll.id, updated);
    } catch {
      // Already voted or server error — clear pending, show results if possible
      setPendingOptionId(null);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="poll-card">
      {/* Purple label */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)', marginBottom: 8, letterSpacing: '0.2px' }}>
        Poll&nbsp;·&nbsp;{total} {total === 1 ? 'vote' : 'votes'}
      </div>

      <p className="poll-question">{poll.question}</p>

      {hasVoted ? (
        /* ── Results view (after voting) ── */
        <div className="poll-results">
          {poll.options.map(option => {
            const count = option.vote_count ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isVoted = option.id === poll.user_voted_option_id;
            const maxVotes = Math.max(...poll.options.map(o => o.vote_count ?? 0));
            const isWinner = total > 0 && (option.vote_count ?? 0) === maxVotes && maxVotes > 0;
            return (
              <div key={option.id} className={`poll-result-bar${isWinner ? ' poll-result-winner' : ''}`}>
                <div className="poll-result-fill" style={{ width: `${pct}%` }} />
                <div className="poll-result-row">
                  <span className="poll-result-text">
                    {isVoted && <span className="poll-check">✓</span>}
                    {option.text}
                  </span>
                  <span className="poll-result-pct">{pct}%</span>
                </div>
              </div>
            );
          })}
          <div className="poll-total">{total} {total === 1 ? 'vote' : 'votes'}</div>
        </div>
      ) : (
        /* ── Selection view (before voting) ── */
        <div className="poll-options">
          {poll.options.map(option => {
            const isSelected = pendingOptionId === option.id;
            return (
              <button
                key={option.id}
                className={`poll-option-btn${isSelected ? ' poll-option-selected' : ''}`}
                onClick={() => handleSelect(option.id)}
                disabled={committing}
              >
                {/* Radio circle */}
                <span className={`poll-radio${isSelected ? ' poll-radio-selected' : ''}`} />
                <span className="poll-option-text">{option.text}</span>
              </button>
            );
          })}
          {committing && (
            <div style={{ fontSize: 12, color: 'var(--purple)', textAlign: 'center', marginTop: 4, fontWeight: 600 }}>
              Submitting…
            </div>
          )}
          {!user?.email && (
            <p className="poll-signin-hint">Sign in to vote</p>
          )}
        </div>
      )}
    </div>
  );
}
