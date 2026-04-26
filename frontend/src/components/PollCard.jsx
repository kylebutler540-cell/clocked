import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { seedPoll, getVotedPoll, recordVote, subscribePoll } from '../lib/pollStore';

export default function PollCard({ poll: initialPoll }) {
  // Seed the store on mount (only if not already voted in this session)
  useEffect(() => {
    if (initialPoll?.id) seedPoll(initialPoll.id, initialPoll);
  }, [initialPoll?.id]); // eslint-disable-line

  // If the user already voted in this session, use the stored result; otherwise use prop
  const [poll, setPoll] = useState(() => {
    if (!initialPoll?.id) return initialPoll;
    const stored = getVotedPoll(initialPoll.id);
    // Prefer stored voted state over feed data (which might be stale/pre-vote)
    if (stored?.user_voted_option_id) return stored;
    return initialPoll;
  });

  const [voting, setVoting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Subscribe to vote updates from other PollCard instances for the same poll
  useEffect(() => {
    if (!initialPoll?.id) return;
    const unsub = subscribePoll(initialPoll.id, (updated) => {
      setPoll(updated);
    });
    return unsub;
  }, [initialPoll?.id]); // eslint-disable-line

  // Sync if the feed refreshes with a voted state we don't have yet
  useEffect(() => {
    if (!initialPoll?.id) return;
    if (initialPoll.user_voted_option_id && !poll.user_voted_option_id) {
      setPoll(initialPoll);
      recordVote(initialPoll.id, initialPoll);
    }
  }, [initialPoll?.user_voted_option_id]); // eslint-disable-line

  if (!poll) return null;

  const hasVoted = !!poll.user_voted_option_id;
  const total = poll.total_votes != null
    ? poll.total_votes
    : poll.options.reduce((s, o) => s + (o.vote_count ?? 0), 0);

  async function handleVote(optionId) {
    if (hasVoted || voting) return;
    if (!user?.email) {
      navigate('/signup');
      return;
    }
    setVoting(true);
    try {
      const res = await api.post(`/polls/${poll.id}/vote`, { optionId });
      const updated = res.data;
      setPoll(updated);
      recordVote(poll.id, updated); // broadcast to all other PollCards for this poll
    } catch {
      // Already voted or server error — silently ignore
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="poll-card">
      <p className="poll-question">{poll.question}</p>

      {hasVoted ? (
        <div className="poll-results">
          {poll.options.map(option => {
            const count = option.vote_count ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isVoted = option.id === poll.user_voted_option_id;
            const maxVotes = Math.max(...poll.options.map(o => o.vote_count ?? 0));
            const isWinner = total > 0 && (option.vote_count ?? 0) === maxVotes && maxVotes > 0;
            return (
              <div
                key={option.id}
                className={`poll-result-bar${isWinner ? ' poll-result-winner' : ''}`}
              >
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
        <div className="poll-options">
          {poll.options.map(option => (
            <button
              key={option.id}
              className="poll-option-btn"
              onClick={() => handleVote(option.id)}
              disabled={voting}
            >
              {option.text}
            </button>
          ))}
          {!user?.email && (
            <p className="poll-signin-hint">Sign in to vote</p>
          )}
        </div>
      )}
    </div>
  );
}
