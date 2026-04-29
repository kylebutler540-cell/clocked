import React, { useState, useEffect } from 'react';

const SLIDER_LABELS = { '1': 'Very Bad', '2': 'Bad', '3': 'Okay', '4': 'Good', '5': 'Great' };
const SLIDER_COLORS = { '1': '#EF4444', '2': '#F97316', '3': '#EAB308', '4': '#22C55E', '5': '#15803D' };

function ResultBar({ label, pct, color }) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="ppc-result-row">
      <span className="ppc-result-label">{label}</span>
      <div className="ppc-result-bar-wrap">
        <div className="ppc-result-bar-fill" style={{ width: `${animPct}%`, background: color }} />
      </div>
      <span className="ppc-result-pct">{pct}%</span>
    </div>
  );
}

export default function PromptPostCard({ post, onReact, onComment }) {
  const {
    occupation, occupationLabel, occupationEmoji,
    question, responseType, pollOptions,
    userResponse, results, totalResponses,
    likeCount, dislikeCount, saveCount, commentCount,
    userLiked, userDisliked, userSaved,
    isPinned,
  } = post;

  return (
    <div className={`ppc${isPinned ? ' pinned' : ''}`}>
      {isPinned && <span className="ppc-pinned-badge">Your Answer</span>}

      <span className="ppc-occupation">{occupationEmoji} {occupationLabel}</span>

      <div className="ppc-question">{question}</div>

      {/* Answer pill */}
      {userResponse === 'yes' && (
        <span className="ppc-answer-pill yes">👍 Yes</span>
      )}
      {userResponse === 'no' && (
        <span className="ppc-answer-pill no">👎 No</span>
      )}

      {/* Results */}
      {totalResponses > 0 && results && (
        <div className="ppc-results">
          {responseType === 'yesno' && (
            <>
              <ResultBar label="Yes" pct={results.yes?.pct ?? 0} color="#22C55E" />
              <ResultBar label="No"  pct={results.no?.pct  ?? 0} color="#EF4444" />
            </>
          )}
          {responseType === 'slider' && ['1','2','3','4','5'].map(v => (
            <ResultBar key={v} label={SLIDER_LABELS[v]} pct={results[v]?.pct ?? 0} color={SLIDER_COLORS[v]} />
          ))}
          {responseType === 'poll' && pollOptions && pollOptions.map(opt => (
            <ResultBar key={opt} label={opt} pct={results[opt]?.pct ?? 0} color="#6366F1" />
          ))}
          <div className="ppc-total">{totalResponses} {totalResponses === 1 ? 'response' : 'responses'}</div>
        </div>
      )}

      {/* Engagement */}
      <div className="ppc-actions">
        {/* Like */}
        <button className={`ppc-action-btn${userLiked ? ' liked' : ''}`} onClick={() => onReact('like')}>
          <svg viewBox="0 0 24 24" fill={userLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          {likeCount > 0 && likeCount}
        </button>

        {/* Dislike */}
        <button className={`ppc-action-btn${userDisliked ? ' disliked' : ''}`} onClick={() => onReact('dislike')}>
          <svg viewBox="0 0 24 24" fill={userDisliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
          </svg>
          {dislikeCount > 0 && dislikeCount}
        </button>

        {/* Comment */}
        <button className="ppc-action-btn" onClick={onComment}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {commentCount > 0 && commentCount}
        </button>

        {/* Save */}
        <button className={`ppc-action-btn${userSaved ? ' saved' : ''}`} onClick={() => onReact('save')}>
          <svg viewBox="0 0 24 24" fill={userSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {saveCount > 0 && saveCount}
        </button>
      </div>
    </div>
  );
}
