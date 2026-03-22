import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { timeAgo, ratingToEmoji, generateAnonName } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PaywallModal from './PaywallModal';
import FlagModal from './FlagModal';

const RATING_EMOJIS = [
  { value: 'BAD', emoji: '😡', color: '#EF4444' },
  { value: 'NEUTRAL', emoji: '😐', color: '#EAB308' },
  { value: 'GOOD', emoji: '😊', color: '#22C55E', greenFilter: true },
];

function AnonAvatar() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="18" cy="18" r="18" fill="#3a3a3a"/>
      <circle cx="18" cy="14" r="6" fill="#888"/>
      <path d="M6 30 Q6 22 18 22 Q30 22 30 30" fill="#888"/>
    </svg>
  );
}

function getPreviewText(text) {
  // ~1.5 sentences: first full sentence + first ~55% of second (cuts mid-sentence)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length >= 2) {
    return sentences[0] + sentences[1].slice(0, Math.ceil(sentences[1].length * 0.55));
  }
  return text.slice(0, 130);
}

export default function PostCard({ post: initialPost, onUpdate }) {
  const [post, setPost] = useState(initialPost);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const { isSubscribed } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  async function handleLike() {
    try {
      const res = await api.post(`/posts/${post.id}/like`);
      setPost(p => ({ ...p, likes: res.data.likes }));
    } catch {
      addToast('Failed to like post');
    }
  }

  async function handleDislike() {
    try {
      const res = await api.post(`/posts/${post.id}/dislike`);
      setPost(p => ({ ...p, dislikes: res.data.dislikes }));
    } catch {
      addToast('Failed to react to post');
    }
  }

  async function handleSave() {
    try {
      const res = await api.post(`/posts/${post.id}/save`);
      setPost(p => ({ ...p, saved: res.data.saved }));
      addToast(res.data.saved ? 'Post saved' : 'Post unsaved');
    } catch {
      addToast('Failed to save post');
    }
  }

  function handleComment() {
    navigate(`/post/${post.id}`);
  }

  function handleEmployerClick(e) {
    e.stopPropagation();
    navigate(`/company/${post.employer_place_id}`, {
      state: { name: post.employer_name, address: post.employer_address },
    });
  }

  const mediaUrls = post.media_urls || [];
  const gridClass = mediaUrls.length === 1 ? 'cols-1'
    : mediaUrls.length === 2 ? 'cols-2'
    : mediaUrls.length >= 3 ? 'cols-3'
    : '';

  const previewText = post.body_truncated ? getPreviewText(post.body) : post.body;

  return (
    <>
      <article className="post-card" onClick={() => navigate(`/post/${post.id}`)}>
        {/* Header */}
        <div className="post-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
            <AnonAvatar />
            <div className="post-author">
              <span className="post-username">{generateAnonName(post.anonymous_user_id)}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button className="post-employer" onClick={handleEmployerClick} style={{ textAlign: 'left' }}>
                  {post.employer_name}
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  {post.employer_address}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginLeft: 6 }}>
            {/* All 3 emojis: matching one colored, others muted gray */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginRight: 4 }}>
              {RATING_EMOJIS.map(r => {
                const isActive = post.rating_emoji === r.value;
                return (
                  <span
                    key={r.value}
                    style={{
                      fontSize: isActive ? 20 : 16,
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: isActive ? r.color : 'transparent',
                      border: `2px solid ${isActive ? r.color : '#444'}`,
                      opacity: isActive ? 1 : 0.25,
                      filter: r.greenFilter ? 'hue-rotate(85deg) saturate(1.4) brightness(1.1)' : 'none',
                    }}
                  >
                    {r.emoji}
                  </span>
                );
              })}
            </div>
            <button
              className="post-flag-btn"
              onClick={e => { e.stopPropagation(); setShowFlag(true); }}
              aria-label="Flag post"
            >
              ⚑
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="post-body">
          {post.header && <div className="post-title">{post.header}</div>}

          <div className="post-text">
            {post.body_truncated ? (
              <p style={{
                margin: 0,
                WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
              }}>
                {previewText}
              </p>
            ) : (
              <p>{previewText}</p>
            )}
          </div>

          {post.body_truncated && !isSubscribed && (
            <button
              className="see-more-btn"
              onClick={e => { e.stopPropagation(); setShowPaywall(true); }}
            >
              🔓 See Full Review — $2.99/mo
            </button>
          )}
        </div>

        {/* Media */}
        {mediaUrls.length > 0 && (
          <div className="post-media">
            {mediaUrls.length === 1 ? (
              <img src={mediaUrls[0]} alt="Review media" loading="lazy" />
            ) : (
              <div className={`media-grid ${gridClass}`}>
                {mediaUrls.slice(0, 4).map((url, i) => (
                  <div key={i} className="media-item">
                    <img src={url} alt={`Media ${i + 1}`} loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="post-actions" onClick={e => e.stopPropagation()}>
          <button
            className={`action-btn ${post.liked ? 'liked' : ''}`}
            onClick={handleLike}
            aria-label="Like"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            {post.likes > 0 && <span>{post.likes}</span>}
          </button>

          <button
            className={`action-btn ${post.disliked ? 'disliked' : ''}`}
            onClick={handleDislike}
            aria-label="Dislike"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
              <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
            </svg>
            {post.dislikes > 0 && <span>{post.dislikes}</span>}
          </button>

          <button
            className={`action-btn ${post.comment_count > 0 ? 'commented' : ''}`}
            onClick={handleComment}
            aria-label="Comment"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {post.comment_count > 0 && <span>{post.comment_count}</span>}
          </button>

          <button
            className={`action-btn ${post.saved ? 'saved' : ''}`}
            onClick={handleSave}
            aria-label={post.saved ? 'Unsave' : 'Save'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={post.saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>

          <div className="action-spacer" />

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(post.created_at)}</span>
        </div>
      </article>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      {showFlag && <FlagModal postId={post.id} onClose={() => setShowFlag(false)} />}
    </>
  );
}
