import React, { useState, useRef, useEffect } from 'react';
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

function getPreviewText(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length >= 2) {
    return sentences[0] + sentences[1].slice(0, Math.ceil(sentences[1].length * 0.55));
  }
  return text.slice(0, 130);
}

function RatingBadge({ value }) {
  const r = RATING_EMOJIS.find(x => x.value === value);
  if (!r) return null;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
      background: `${r.color}22`,
      color: r.color,
      border: `1px solid ${r.color}44`,
      filter: r.greenFilter ? 'hue-rotate(85deg) saturate(1.4) brightness(1.1)' : 'none',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 15 }}>{r.emoji}</span>
      {value === 'BAD' ? 'Bad' : value === 'NEUTRAL' ? 'Neutral' : 'Good'}
    </span>
  );
}

export default function PostCard({ post: initialPost, onUpdate, onDelete }) {
  const [post, setPost] = useState(initialPost);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const { user, isSubscribed } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const isMock = post.id?.startsWith('mock-');
  const isOwner = !isMock && user?.id && post.anonymous_user_id === user.id;

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMenu]);

  async function handleLike() {
    if (isMock) return;
    try {
      const res = await api.post(`/posts/${post.id}/like`);
      setPost(p => ({ ...p, likes: res.data.likes, dislikes: res.data.dislikes, liked: res.data.liked, disliked: res.data.disliked }));
    } catch { addToast('Failed to like post'); }
  }

  async function handleDislike() {
    if (isMock) return;
    try {
      const res = await api.post(`/posts/${post.id}/dislike`);
      setPost(p => ({ ...p, likes: res.data.likes, dislikes: res.data.dislikes, liked: res.data.liked, disliked: res.data.disliked }));
    } catch { addToast('Failed to dislike post'); }
  }

  async function handleSave() {
    try {
      const res = await api.post(`/posts/${post.id}/save`);
      setPost(p => ({ ...p, saved: res.data.saved }));
      addToast(res.data.saved ? 'Post saved' : 'Post unsaved');
    } catch { addToast('Failed to save post'); }
  }

  function handleEmployerClick(e) {
    e.stopPropagation();
    navigate(`/company/${post.employer_place_id}`, {
      state: { name: post.employer_name, address: post.employer_address },
    });
  }

  function startEditing(e) {
    e.stopPropagation();
    setShowMenu(false);
    setEditText(post.body);
    setEditing(true);
  }

  async function handleSaveEdit(e) {
    e.stopPropagation();
    if (!editText.trim()) return;
    try {
      const res = await api.put(`/posts/${post.id}`, { body: editText.trim() });
      setPost(p => ({ ...p, body: res.data.body, body_truncated: res.data.body_truncated }));
      setEditing(false);
    } catch {
      addToast('Failed to update post');
    }
  }

  async function handleDeletePost(e) {
    e.stopPropagation();
    setShowMenu(false);
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${post.id}`);
      if (onDelete) onDelete();
      else navigate('/');
    } catch {
      addToast('Failed to delete post');
    }
  }

  const mediaUrls = post.media_urls || [];
  const previewText = post.body_truncated ? getPreviewText(post.body) : post.body;

  return (
    <>
      <article className="post-card" onClick={() => { if (!isMock && !editing) navigate(`/post/${post.id}`); }}>

        {/* Employer name — top, like a subreddit */}
        <div className="post-employer-row">
          <button className="post-employer-name" onClick={handleEmployerClick}>
            {post.employer_name}
          </button>
          <span className="post-employer-sep">·</span>
          <span className="post-meta-time">{post.employer_address?.split(',').slice(1, 3).join(',').trim()}</span>
          <div style={{ flex: 1 }} />
          <RatingBadge value={post.rating_emoji} />
          {isOwner && (
            <div
              style={{ position: 'relative' }}
              ref={menuRef}
              onClick={e => e.stopPropagation()}
            >
              <button
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '2px 6px',
                  fontSize: 18, lineHeight: 1, marginLeft: 4,
                }}
                onClick={() => setShowMenu(v => !v)}
                aria-label="Post options"
              >
                ⋮
              </button>
              {showMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', zIndex: 200,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '4px 0', minWidth: 160,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}>
                  <button className="topbar-dropdown-item" onClick={startEditing}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit Post
                  </button>
                  <button className="topbar-dropdown-item" style={{ color: '#EF4444' }} onClick={handleDeletePost}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Posted by + time */}
        <div className="post-byline">
          Posted by <span className="post-byline-user">{generateAnonName(post.anonymous_user_id)}</span>
          <span className="post-byline-sep">·</span>
          {timeAgo(post.created_at)}
        </div>

        {/* Title */}
        {post.header && <h3 className="post-title-large">{post.header}</h3>}

        {/* Body — or inline edit form */}
        {editing ? (
          <div onClick={e => e.stopPropagation()} style={{ marginBottom: 8 }}>
            <textarea
              className="form-input"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={5}
              maxLength={5000}
              style={{ width: '100%', resize: 'vertical', marginBottom: 8 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: 13 }}
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
              >
                Save
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 16px', fontSize: 13 }}
                onClick={e => { e.stopPropagation(); setEditing(false); }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="post-text">
              {post.body_truncated ? (
                <p style={{
                  margin: 0,
                  WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                }}>{previewText}</p>
              ) : (
                <p>{previewText}</p>
              )}
            </div>

            {post.body_truncated && !isSubscribed && (
              <button
                className="see-more-btn"
                onClick={e => { e.stopPropagation(); setShowPaywall(true); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6,flexShrink:0}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                See Full Review — $2.99/mo
              </button>
            )}
          </>
        )}

        {/* Media */}
        {mediaUrls.length > 0 && (
          <div className="post-media">
            {mediaUrls.length === 1 ? (
              <img src={mediaUrls[0]} alt="Review media" loading="lazy" />
            ) : (
              <div className={`media-grid ${mediaUrls.length === 2 ? 'cols-2' : 'cols-3'}`}>
                {mediaUrls.slice(0, 4).map((url, i) => (
                  <div key={i} className="media-item">
                    <img src={url} alt={`Media ${i + 1}`} loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="post-actions" onClick={e => e.stopPropagation()}>
          {/* Vote pill */}
          <div className="vote-pill">
            <button
              className={`vote-btn${post.liked ? ' active' : ''}`}
              onClick={handleLike}
              aria-label="Like"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
            </button>
            {post.likes > 0 && (
              <span className="vote-score" style={{ color: '#22C55E' }}>+{post.likes}</span>
            )}
            <button
              className={`vote-btn${post.disliked ? ' active-down' : ''}`}
              onClick={handleDislike}
              aria-label="Dislike"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
              </svg>
            </button>
            {post.dislikes > 0 && (
              <span className="vote-score" style={{ color: '#EF4444' }}>-{post.dislikes}</span>
            )}
          </div>

          {/* Comments */}
          <button className="action-btn" onClick={() => !isMock && navigate(`/post/${post.id}`)} aria-label="Comments">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{post.comment_count > 0 ? `${post.comment_count} Comments` : 'Comment'}</span>
          </button>

          {/* Save */}
          <button className={`action-btn${post.saved ? ' saved' : ''}`} onClick={handleSave} aria-label="Save">
            <svg width="16" height="16" viewBox="0 0 24 24" fill={post.saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>{post.saved ? 'Saved' : 'Save'}</span>
          </button>

          <div style={{ flex: 1 }} />

          {/* Flag */}
          <button
            className="action-btn"
            onClick={e => { e.stopPropagation(); setShowFlag(true); }}
            aria-label="Flag"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </button>
        </div>
      </article>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      {showFlag && <FlagModal postId={post.id} onClose={() => setShowFlag(false)} />}
    </>
  );
}
