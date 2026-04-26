import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  seedPoll,
  recordVote,
  cancelVoteInFlight,
  markVoteInFlight,
  subscribePoll,
} from '../lib/pollStore';

export default function PollCard({ poll: initialPoll }) {
  // Always seed with fresh server data on mount (seedPoll skips if vote in-flight)
  useEffect(() => {
    if (initialPoll?.id) seedPoll(initialPoll.id, initialPoll);
  }); // no deps — runs every render so fresh feed data always wins

  // Initial state: trust server's user_voted_option_id directly
  // The server already knows whether THIS user has voted (JWT-based lookup)
  const [poll, setPoll] = useState(initialPoll);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Sync when parent prop changes (feed refresh, navigation back)
  // Always take server data unless a vote is pending
  useEffect(() => {
    if (!initialPoll) return;
    setPoll(initialPoll);
  }, [
    initialPoll?.id,
    initialPoll?.user_voted_option_id,
    initialPoll?.total_votes,
  ]); // eslint-disable-line

  // Subscribe to cross-feed vote broadcasts (same user, multiple feed instances)
  useEffect(() => {
    if (!initialPoll?.id) return;
    return subscribePoll(initialPoll.id, updated => setPoll(updated));
  }, [initialPoll?.id]); // eslint-disable-line

  if (!poll) return null;

  const hasVoted = !!poll.user_voted_option_id;
  const total = poll.total_votes ?? poll.options.reduce((s, o) => s + (o.vote_count ?? 0), 0);

  async function handleVote(optionId) {
    if (loading) return;
    if (!user?.email) { navigate('/signup'); return; }
    if (poll.user_voted_option_id === optionId) return; // same option, no-op

    setLoading(true);
    markVoteInFlight(poll.id);

    // Optimistic update — show selection instantly
    const optimistic = { ...poll, user_voted_option_id: optionId };
    setPoll(optimistic);

    try {
      const res = await api.post(`/polls/${poll.id}/vote`, { optionId });
      const confirmed = res.data;
      setPoll(confirmed);
      recordVote(poll.id, confirmed); // broadcast to other PollCards showing this poll
    } catch {
      // Revert on failure
      cancelVoteInFlight(poll.id);
      setPoll(poll);
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
            >
              {/* Subtle fill bar — only after voting */}
              {pct !== null && (
                <span className="poll-option-fill" style={{ width: `${pct}%` }} />
              )}

              {/* Radio circle */}
              <span className={`poll-radio${isSelected ? ' poll-radio-selected' : ''}`} />

              {/* Option text */}
              <span className="poll-option-text">{option.text}</span>

              {/* Percentage — only after voting */}
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
