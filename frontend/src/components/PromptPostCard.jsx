import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORY_LABELS = {
  management: 'Management',
  workload:   'Workload',
  customers:  'Customers',
  pay:        'Pay & Worth',
  stress:     'Stress',
  culture:    'Culture',
  teamwork:   'Teamwork',
};

const SLIDER_LABELS = { '1': '😡 Very Bad', '2': '😕 Bad', '3': '😐 Okay', '4': '🙂 Good', '5': '😄 Great' };
const SLIDER_COLORS = { '1': '#EF4444', '2': '#F97316', '3': '#EAB308', '4': '#22C55E', '5': '#15803D' };

function ResultBar({ label, pct, color, isUserAnswer }) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className={`ppc-result-row${isUserAnswer ? ' ppc-result-row-mine' : ''}`}>
      <span className="ppc-result-label">
        {isUserAnswer && <span className="ppc-result-check">✓ </span>}
        {label}
      </span>
      <div className="ppc-result-bar-wrap">
        <div
          className="ppc-result-bar-fill"
          style={{ width: `${animPct}%`, background: isUserAnswer ? color : `${color}55` }}
        />
      </div>
      <span className="ppc-result-pct">{pct}%</span>
    </div>
  );
}

export default function PromptPostCard({ post, onReact, onComment }) {
  const navigate = useNavigate();
  const {
    occupation, occupationLabel, occupationEmoji,
    question, hook, responseType, pollOptions,
    userResponse, results, totalResponses,
    likeCount, dislikeCount, saveCount, commentCount,
    userLiked, userDisliked, userSaved,
    isPinned, category, friendResponses,
  } = post;

  const categoryLabel = CATEGORY_LABELS[category] || category || '';

  return (
    <div className={`ppc${isPinned ? ' pinned' : ''}`}>
      {/* Top bar: category left, occupation right */}
      <div className="ppc-top-bar">
        {categoryLabel && <span className="ppc-category-badge">{categoryLabel.toUpperCase()}</span>}
        <span className="ppc-occupation-pill">{occupationEmoji} {occupationLabel}</span>
      </div>

      {/* Hook + Question */}
      {hook && <div className="ppc-hook">{hook}</div>}
      <div className="ppc-question">{question}</div>

      {/* Response count */}
      <div className="ppc-total">
        {totalResponses} {totalResponses === 1 ? 'person' : 'people'} answered today
      </div>

      {/* Friend chips */}
      {friendResponses && friendResponses.length > 0 && (
        <div className="ppc-friends-row">
          {friendResponses.map((f, i) => (
            <div key={i} className="ppc-friend-chip">
              {f.avatar_url
                ? <img src={f.avatar_url} alt="" className="ppc-friend-avatar" />
                : <span className="ppc-friend-anon">#{f.anon_number}</span>
              }
              <span className="ppc-friend-answer">{f.response_value === 'yes' ? '👍' : '👎'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="ppc-results">
          {responseType === 'yesno' && (
            <>
              <ResultBar
                label="Yes"
                pct={results.yes?.pct ?? 0}
                color="#22C55E"
                isUserAnswer={userResponse === 'yes'}
              />
              <ResultBar
                label="No"
                pct={results.no?.pct ?? 0}
                color="#EF4444"
                isUserAnswer={userResponse === 'no'}
              />
            </>
          )}
          {responseType === 'slider' && ['1','2','3','4','5'].map(v => (
            <ResultBar
              key={v}
              label={SLIDER_LABELS[v]}
              pct={results[v]?.pct ?? 0}
              color={SLIDER_COLORS[v]}
              isUserAnswer={userResponse === v}
            />
          ))}
          {responseType === 'poll' && pollOptions && pollOptions.map(opt => (
            <ResultBar
              key={opt}
              label={opt}
              pct={results[opt]?.pct ?? 0}
              color="#6366F1"
              isUserAnswer={userResponse === opt}
            />
          ))}
        </div>
      )}

      {/* Change my answer (user's pinned card only) */}
      {isPinned && userResponse && (
        <button
          className="ppc-change-btn"
          onClick={() => navigate(`/daily-prompts?change=true&occ=${occupation}`, { replace: true })}
        >
          Change my answer
        </button>
      )}

      {/* Engagement row */}
      <div className="ppc-actions">
        <div className="ppc-actions-left">
          {/* Like */}
          <button className={`ppc-action-btn${userLiked ? ' liked' : ''}`} onClick={() => onReact('like')}>
            <svg viewBox="0 0 24 24" fill={userLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          {/* Dislike */}
          <button className={`ppc-action-btn${userDisliked ? ' disliked' : ''}`} onClick={() => onReact('dislike')}>
            <svg viewBox="0 0 24 24" fill={userDisliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
            {dislikeCount > 0 && <span>{dislikeCount}</span>}
          </button>

          {/* Comment */}
          <button className="ppc-action-btn" onClick={onComment}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>
        </div>

        <div className="ppc-actions-right">
          {/* Save */}
          <button className={`ppc-action-btn${userSaved ? ' saved' : ''}`} onClick={() => onReact('save')}>
            <svg viewBox="0 0 24 24" fill={userSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {saveCount > 0 && <span>{saveCount}</span>}
          </button>

          {/* Share */}
          <button className="ppc-action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>

          {/* Flag */}
          <button className="ppc-action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
