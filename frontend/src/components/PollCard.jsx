import React, { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PollCard({ poll: initialPoll }) {
  const [poll, setPoll] = useState(initialPoll);
  const [voting, setVoting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const hasVoted = !!poll.user_voted_option_id;
  const total = poll.total_votes ?? poll.options.reduce((s, o) => s + (o.vote_count ?? 0), 0);

  async function handleVote(optionId) {
    if (hasVoted || voting) return;
    if (!user?.email) {
      navigate('/signup');
      return;
    }
    setVoting(true);
    try {
      const res = await api.post(`/polls/${poll.id}/vote`, { optionId });
      setPoll(res.data);
    } catch (err) {
      // Already voted or error — silently ignore
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
            const isWinner = total > 0 && option.vote_count === Math.max(...poll.options.map(o => o.vote_count ?? 0));
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
