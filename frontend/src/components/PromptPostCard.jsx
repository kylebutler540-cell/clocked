import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import CommentSheet from './CommentSheet';

const CATEGORY_LABELS = {
  management: 'Management',
  workload:   'Workload',
  customers:  'Customers',
  pay:        'Pay & Worth',
  stress:     'Stress',
  culture:    'Culture',
  teamwork:   'Teamwork',
};

const CATEGORY_COLORS = {
  management: '#8B5CF6',
  workload:   '#F59E0B',
  customers:  '#3B82F6',
  pay:        '#10B981',
  stress:     '#EF4444',
  culture:    '#EC4899',
  teamwork:   '#06B6D4',
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

export default function PromptPostCard({ post, onReact, onCommentAdded }) {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const {
    occupation, occupationLabel, occupationEmoji,
    question, hook, responseType, pollOptions,
    userResponse, results, totalResponses,
    likeCount, dislikeCount, saveCount, commentCount,
    userLiked, userDisliked, userSaved,
    isPinned, category, friendResponses, postId,
  } = post;

  const categoryLabel = CATEGORY_LABELS[category] || category || '';
  const categoryColor = CATEGORY_COLORS[category] || 'var(--text-muted)';

  return (
    <div className={`ppc${isPinned ? ' pinned' : ''}`}>
      {/* Top bar: category left, occupation right */}
      <div className="ppc-top-bar">
        {categoryLabel && (
        <span
          className="ppc-category-badge"
          style={{ color: categoryColor, background: `${categoryColor}15`, borderColor: `${categoryColor}40` }}
        >
          {categoryLabel.toUpperCase()}
        </span>
      )}
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
          {/* Like — same pill style as normal posts */}
          <button
            onClick={() => onReact('like')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: userLiked ? 'rgba(34,197,94,0.12)' : 'var(--bg-pill)',
              borderRadius: 20, padding: '6px 12px',
              border: `1px solid ${userLiked ? '#22C55E' : 'var(--border)'}`,
              flexShrink: 0, color: userLiked ? '#22C55E' : 'var(--text-muted)',
              minHeight: 36, cursor: 'pointer', outline: 'none',
              transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={userLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}>{likeCount}</span>
          </button>

          {/* Dislike — same pill style as normal posts */}
          <button
            onClick={() => onReact('dislike')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: userDisliked ? 'rgba(239,68,68,0.12)' : 'var(--bg-pill)',
              borderRadius: 20, padding: '6px 12px',
              border: `1px solid ${userDisliked ? '#EF4444' : 'var(--border)'}`,
              flexShrink: 0, color: userDisliked ? '#EF4444' : 'var(--text-muted)',
              minHeight: 36, cursor: 'pointer', outline: 'none',
              transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={userDisliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
              <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}>{dislikeCount}</span>
          </button>

          {/* Comment — same pill style as normal posts */}
          <button
            onClick={() => postId && setShowComments(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--bg-pill)', borderRadius: 20,
              padding: '6px 12px', border: '1px solid var(--border)',
              flexShrink: 0, color: showComments ? 'var(--purple)' : 'var(--text-muted)',
              opacity: showComments ? 0.6 : 1,
              outline: 'none', cursor: 'pointer', transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent', minHeight: 36,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}>{commentCount ?? 0}</span>
          </button>
        </div>

        <div className="ppc-actions-right" />
      </div>

      {/* CommentSheet — exact same as normal posts */}
      {showComments && postId && createPortal(
        <CommentSheet
          postId={postId}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => onCommentAdded && onCommentAdded(occupation)}
          onCommentDeleted={() => {}}
        />,
        document.body
      )}
    </div>
  );
}
