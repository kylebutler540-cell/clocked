import React, { useState, useEffect } from 'react';
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

  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Subscribe to cross-feed vote updates (home → company page → profile, etc.)
  useEffect(() => {
    if (!initialPoll?.id) return;
    return subscribePoll(initialPoll.id, updated => {
      setPoll(updated);
    });
  }, [initialPoll?.id]); // eslint-disable-line

  // Sync if feed refreshes with a voted state we don't have yet
  useEffect(() => {
    if (initialPoll?.user_voted_option_id && !poll?.user_voted_option_id) {
      setPoll(initialPoll);
      recordVote(initialPoll.id, initialPoll);
    }
  }, [initialPoll?.user_voted_option_id]); // eslint-disable-line

  if (!poll) return null;

  const hasVoted = !!poll.user_voted_option_id;
  const total = poll.total_votes ?? poll.options.reduce((s, o) => s + (o.vote_count ?? 0), 0);

  async function handleVote(optionId) {
    if (loading) return;
    if (!user?.email) { navigate('/signup'); return; }
    // Same option tapped again while voted → no-op
    if (poll.user_voted_option_id === optionId) return;

    setLoading(true);
    // Optimistic: highlight the tapped option immediately
    setPoll(prev => ({ ...prev, user_voted_option_id: optionId }));

    try {
      const res = await api.post(`/polls/${poll.id}/vote`, { optionId });
      setPoll(res.data);
      recordVote(poll.id, res.data);
    } catch {
      // Revert optimistic update on failure
      setPoll(prev => ({ ...prev, user_voted_option_id: poll.user_voted_option_id }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="poll-card">
      {/* Purple label */}
      <div className="poll-label">
        Poll&nbsp;·&nbsp;{total} {total === 1 ? 'vote' : 'votes'}
      </div>

      <p className="poll-question">{poll.question}</p>

      <div className="poll-options">
        {poll.options.map(option => {
          const isSelected = poll.user_voted_option_id === option.id;
          const count = option.vote_count ?? 0;
          const pct = hasVoted && total > 0 ? Math.round((count / total) * 100) : null;

          return (
            <button
              key={option.id}
              className={`poll-option-btn${isSelected ? ' poll-option-selected' : ''}`}
              onClick={() => handleVote(option.id)}
              disabled={loading}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              {/* Subtle fill bar shown after voting */}
              {pct !== null && (
                <span
                  className="poll-option-fill"
                  style={{ width: `${pct}%` }}
                />
              )}

              {/* Radio circle */}
              <span className={`poll-radio${isSelected ? ' poll-radio-selected' : ''}`} />

              {/* Option text */}
              <span className="poll-option-text">{option.text}</span>

              {/* Percentage — only shown after voting */}
              {pct !== null && (
                <span className="poll-option-pct">{pct}%</span>
              )}
            </button>
          );
        })}
      </div>

      {!user?.email && (
        <p className="poll-signin-hint">Sign in to vote</p>
      )}
    </div>
  );
}
