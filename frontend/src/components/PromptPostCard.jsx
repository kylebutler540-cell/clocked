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

export default function PromptPostCard({ post, onReact }) {
  const {
    occupation, occupationLabel, occupationEmoji,
    question, responseType, pollOptions,
    userResponse, results, totalResponses,
    likeCount, saveCount, userLiked, userSaved,
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
        <button className={`ppc-action-btn${userLiked ? ' liked' : ''}`} onClick={() => onReact('like')}>
          <svg viewBox="0 0 24 24" fill={userLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likeCount > 0 && likeCount}
        </button>

        <button className={`ppc-action-btn${userSaved ? ' saved' : ''}`} onClick={() => onReact('save')}>
          <svg viewBox="0 0 24 24" fill={userSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {saveCount > 0 && saveCount}
        </button>

        <button className="ppc-action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
