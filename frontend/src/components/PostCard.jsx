import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { timeAgo, ratingToEmoji, generateAnonName } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import FlagModal from './FlagModal';
import CommentSheet from './CommentSheet';
import { clearFeedCache } from './Feed';
import BusinessLogo from './BusinessLogo';

// Module-level reaction cache: survives navigation within the same browser session
// Falls back to localStorage for cross-session persistence
const _reactionCache = new Map(); // postId -> 'like' | 'dislike' | null

function getCachedReaction(postId) {
  if (_reactionCache.has(postId)) return _reactionCache.get(postId);
  try {
    const v = localStorage.getItem(`clocked-reaction-${postId}`);
    if (v) { _reactionCache.set(postId, v); return v; }
  } catch {}
  return null;
}

function setCachedReaction(postId, value) {
  _reactionCache.set(postId, value);
  try {
    if (value) localStorage.setItem(`clocked-reaction-${postId}`, value);
    else localStorage.removeItem(`clocked-reaction-${postId}`);
  } catch {}
}

function clearCachedReaction(postId) {
  _reactionCache.delete(postId);
  try { localStorage.removeItem(`clocked-reaction-${postId}`); } catch {}
}

const RATING_EMOJIS = [
  { value: 'BAD', emoji: '😡', color: '#EF4444' },
  { value: 'NEUTRAL', emoji: '😐', color: '#EAB308' },
  { value: 'GOOD', emoji: '😊', color: '#22C55E', greenFilter: true },
];



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
      flexShrink: 0,

    }}>
      <span style={{ fontSize: 15, filter: r.greenFilter ? 'sepia(1) saturate(4) hue-rotate(65deg) brightness(0.9)' : 'none' }}>{r.emoji}</span>
      {value === 'BAD' ? 'Bad' : value === 'NEUTRAL' ? 'Neutral' : 'Good'}
    </span>
  );
}

export default function PostCard({ post: initialPost, onUpdate, onDelete, closeButton }) {
  // Apply cached reaction as fallback if server didn't return user context
  const getInitialPost = () => {
    if (initialPost.liked || initialPost.disliked) {
      // Server knows — sync cache to match
      setCachedReaction(initialPost.id, initialPost.liked ? 'like' : 'dislike');
      return initialPost;
    }
    const cached = getCachedReaction(initialPost.id);
    if (cached === 'like') return { ...initialPost, liked: true, disliked: false };
    if (cached === 'dislike') return { ...initialPost, liked: false, disliked: true };
    return initialPost;
  };

  const [post, setPost] = useState(getInitialPost);

  const [showFlag, setShowFlag] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPostActionModal, setShowPostActionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxUrl) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [lightboxUrl]);
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const isMock = post.id?.startsWith('mock-');
  const isOwner = !isMock && user?.id && post.anonymous_user_id === user.id;

  // When the parent re-fetches and passes a fresh initialPost, re-apply cache if server has no reaction
  useEffect(() => {
    if (!initialPost.liked && !initialPost.disliked) {
      const cached = getCachedReaction(initialPost.id);
      if (cached === 'like') {
        setPost(p => ({ ...p, liked: true, disliked: false }));
      } else if (cached === 'dislike') {
        setPost(p => ({ ...p, liked: false, disliked: true }));
      }
    } else {
      // Server returned a real reaction — trust it and sync cache
      setCachedReaction(initialPost.id, initialPost.liked ? 'like' : 'dislike');
      setPost(p => ({ ...p, liked: initialPost.liked, disliked: initialPost.disliked }));
    }
  }, [initialPost.id, initialPost.liked, initialPost.disliked]);

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
    if (!user?.email) { navigate('/signup'); return; }
    const prev = { liked: post.liked, disliked: post.disliked, likes: post.likes, dislikes: post.dislikes };
    const prevCached = getCachedReaction(post.id);

    // Optimistic update
    if (post.liked) {
      setPost(p => ({ ...p, liked: false, likes: p.likes - 1 }));
      clearCachedReaction(post.id);
    } else if (post.disliked) {
      setPost(p => ({ ...p, liked: true, disliked: false, likes: p.likes + 1, dislikes: p.dislikes - 1 }));
      setCachedReaction(post.id, 'like');
    } else {
      setPost(p => ({ ...p, liked: true, likes: p.likes + 1 }));
      setCachedReaction(post.id, 'like');
    }

    try {
      const res = await api.post(`/posts/${post.id}/like`);
      setPost(p => ({ ...p, likes: res.data.likes, dislikes: res.data.dislikes, liked: res.data.liked, disliked: res.data.disliked }));
      if (res.data.liked) setCachedReaction(post.id, 'like');
      else if (res.data.disliked) setCachedReaction(post.id, 'dislike');
      else clearCachedReaction(post.id);
    } catch (err) {
      setPost(p => ({ ...p, ...prev }));
      if (prevCached) setCachedReaction(post.id, prevCached);
      else clearCachedReaction(post.id);
      addToast(err.response?.status === 401 ? 'Sign in to like posts' : 'Failed to like post');
    }
  }

  async function handleDislike() {
    if (isMock) return;
    if (!user?.email) { navigate('/signup'); return; }
    const prev = { liked: post.liked, disliked: post.disliked, likes: post.likes, dislikes: post.dislikes };
    const prevCached = getCachedReaction(post.id);

    // Optimistic update
    if (post.disliked) {
      setPost(p => ({ ...p, disliked: false, dislikes: p.dislikes - 1 }));
      clearCachedReaction(post.id);
    } else if (post.liked) {
      setPost(p => ({ ...p, disliked: true, liked: false, dislikes: p.dislikes + 1, likes: p.likes - 1 }));
      setCachedReaction(post.id, 'dislike');
    } else {
      setPost(p => ({ ...p, disliked: true, dislikes: p.dislikes + 1 }));
      setCachedReaction(post.id, 'dislike');
    }

    try {
      const res = await api.post(`/posts/${post.id}/dislike`);
      setPost(p => ({ ...p, likes: res.data.likes, dislikes: res.data.dislikes, liked: res.data.liked, disliked: res.data.disliked }));
      if (res.data.disliked) setCachedReaction(post.id, 'dislike');
      else if (res.data.liked) setCachedReaction(post.id, 'like');
      else clearCachedReaction(post.id);
    } catch (err) {
      setPost(p => ({ ...p, ...prev }));
      if (prevCached) setCachedReaction(post.id, prevCached);
      else clearCachedReaction(post.id);
      addToast(err.response?.status === 401 ? 'Sign in to dislike posts' : 'Failed to dislike post');
    }
  }

  async function handleSave() {
    if (!user?.email) { navigate('/signup'); return; }
    const prevSaved = post.saved;
    setPost(p => ({ ...p, saved: !p.saved }));
    try {
      const res = await api.post(`/posts/${post.id}/save`);
      setPost(p => ({ ...p, saved: res.data.saved }));
      addToast(res.data.saved ? 'Post saved' : 'Post unsaved');
    } catch (err) {
      setPost(p => ({ ...p, saved: prevSaved }));
      addToast(err.response?.status === 401 ? 'Sign in to save posts' : 'Failed to save post');
    }
  }

  function handleEmployerClick(e) {
    e.stopPropagation();
    navigate(`/company/${post.employer_place_id}`, {
      state: { name: post.employer_name, address: post.employer_address },
    });
  }

  function startEditing(e) {
    if (e?.stopPropagation) e.stopPropagation();
    setShowMenu(false);
    setShowPostActionModal(false);
    navigate('/create', { state: { editPost: post } });
  }

  async function handleSaveEdit(e) {
    if (e?.stopPropagation) e.stopPropagation();
    if (!editText.trim()) return;
    try {
      const res = await api.put(`/posts/${post.id}`, { body: editText.trim() });
      setPost(p => ({ ...p, body: res.data.body, body_truncated: res.data.body_truncated }));
      setEditing(false);
    } catch {
      addToast('Failed to update post');
    }
  }

  async function handleDeletePost() {
    setShowDeleteConfirm(false);
    try {
      await api.delete(`/posts/${post.id}`);
      clearFeedCache();
      if (onDelete) onDelete();
      else navigate('/');
    } catch {
      addToast('Failed to delete post');
    }
  }

  const mediaUrls = post.media_urls || [];
  const previewText = post.body;

  return (
    <>
      <article className="post-card">

        {/* Top row: avatar + display name + time — rating badge — ⋮ */}
        <div className="post-employer-row">
          {/* Avatar */}
          <button
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
            onClick={e => { e.stopPropagation(); if (!isMock) navigate(`/profile/${post.anonymous_user_id}`); }}
          >
            <span style={{
              width: 34, height: 34, borderRadius: '50%', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
              color: '#fff', fontWeight: 700, fontSize: 13,
            }}>
              {post.author_avatar_url
                ? <img src={post.author_avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (post.author_display_name ? post.author_display_name[0].toUpperCase() : 'A')
              }
            </span>
          </button>

          {/* Display name + time — flex:1 spacer, only name/avatar are tappable */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, marginLeft: 8, flex: 1 }}>
            <button
              className="post-byline-user"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, textAlign: 'left', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline', width: 'fit-content', maxWidth: '100%' }}
              onClick={e => { e.stopPropagation(); if (!isMock) navigate(`/profile/${post.anonymous_user_id}`); }}
            >
              {post.author_display_name || 'Anonymous'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.2 }}>{timeAgo(post.created_at)}</span>
          </div>

          <RatingBadge value={post.rating_emoji} />

          {closeButton && closeButton}

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
                onClick={() => setShowPostActionModal(true)}
                aria-label="Post options"
              >
                <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: '-1px', lineHeight: 1 }}>•••</span>
              </button>
            </div>
          )}
        </div>

        {/* Employer name + location — now below the author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
          {!isMock && post.employer_place_id && (
            <button
              type="button"
              onClick={handleEmployerClick}
              style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex' }}
              aria-label={`${post.employer_name} profile`}
            >
              <BusinessLogo placeId={post.employer_place_id} name={post.employer_name} size={26} borderRadius={6} />
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
            <button className="post-employer-name" onClick={handleEmployerClick} style={{ fontSize: 13 }}>
              {post.employer_name}
            </button>
            {post.employer_address && (
              <>
                <span className="post-employer-sep">·</span>
                <span className="post-meta-time">
                  {post.employer_address.replace(/,?\s*USA\s*$/, '').trim()}
                </span>
              </>
            )}
            {post.distance_miles != null && (
              <>
                <span className="post-employer-sep">·</span>
                <span className="post-meta-time">{post.distance_miles} mi</span>
              </>
            )}
          </div>
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
              <p style={{ margin: 0 }}>{previewText}</p>
            </div>


          </>
        )}

        {/* Media */}
        {mediaUrls.length > 0 && (
          <div className="post-media">
            {mediaUrls.length === 1 ? (
              <div className="media-wrapper" style={{ cursor: 'zoom-in' }} onClick={e => { e.stopPropagation(); setLightboxUrl(mediaUrls[0]); }}>
                <div className="media-blur-bg" style={{ backgroundImage: `url(${mediaUrls[0]})` }} />
                <img src={mediaUrls[0]} alt="Review media" loading="lazy" />
              </div>
            ) : (
              <div className={`media-grid ${mediaUrls.length === 2 ? 'cols-2' : 'cols-3'}`}>
                {mediaUrls.slice(0, 4).map((url, i) => (
                  <div key={i} className="media-item" style={{ cursor: 'zoom-in' }} onClick={e => { e.stopPropagation(); setLightboxUrl(url); }}>
                    <img src={url} alt={`Media ${i + 1}`} loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="post-actions" onClick={e => e.stopPropagation()}>
          {/* Like pill */}
          <button
            onClick={handleLike}
            aria-label="Like"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: post.liked ? 'rgba(34,197,94,0.12)' : 'var(--bg-elevated)',
              borderRadius: 20, padding: '6px 12px',
              border: `1px solid ${post.liked ? '#22C55E' : 'var(--border)'}`,
              flexShrink: 0, color: post.liked ? '#22C55E' : 'var(--text-muted)',
              minHeight: 36, cursor: 'pointer', outline: 'none',
              transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}>{post.likes}</span>
          </button>

          {/* Dislike pill */}
          <button
            onClick={handleDislike}
            aria-label="Dislike"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: post.disliked ? 'rgba(239,68,68,0.12)' : 'var(--bg-elevated)',
              borderRadius: 20, padding: '6px 12px',
              border: `1px solid ${post.disliked ? '#EF4444' : 'var(--border)'}`,
              flexShrink: 0, color: post.disliked ? '#EF4444' : 'var(--text-muted)',
              minHeight: 36, cursor: 'pointer', outline: 'none',
              transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={post.disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
              <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}>{post.dislikes}</span>
          </button>

          {/* Comments — pill bubble matching vote-pill style */}
          <button
            onClick={e => { e.stopPropagation(); if (!user?.email) { navigate('/signup'); return; } if (!isMock && !showComments) setShowComments(true); }}
            aria-label="Comments"
            onBlur={e => e.currentTarget.blur()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--bg-elevated)', borderRadius: 20,
              padding: '6px 12px', border: '1px solid var(--border)',
              flexShrink: 0, color: showComments ? 'var(--purple)' : 'var(--text-muted)',
              opacity: showComments ? 0.6 : 1,
              pointerEvents: showComments ? 'none' : 'auto',
              outline: 'none', cursor: 'pointer', transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
              minHeight: 36,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}>{post.comment_count > 0 ? post.comment_count : 0}</span>
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Save */}
          <button className={`action-btn${post.saved ? ' saved' : ''}`} onClick={handleSave} aria-label="Save" style={{ flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={post.saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{post.saved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Flag */}
          <button
            className="action-btn"
            onClick={e => { e.stopPropagation(); if (!user?.email) { navigate('/signup'); return; } setShowFlag(true); }}
            aria-label="Flag"
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </button>
        </div>
      </article>


      {showFlag && createPortal(<FlagModal postId={post.id} postAuthor={post.author_display_name || post.author_username || 'Anonymous'} postUrl={`${window.location.origin}/post/${post.id}`} onClose={() => setShowFlag(false)} />, document.body)}
      <CommentSheet
        postId={post.id}
        post={post}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onCommentAdded={() => setPost(p => ({ ...p, comment_count: (p.comment_count || 0) + 1 }))}
      />

      {showPostActionModal && (
        <div className="modal-overlay" onClick={() => setShowPostActionModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '24px 20px 20px' }}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-secondary btn-full" style={{ padding: '12px', fontSize: 15, fontWeight: 600 }}
                onClick={() => { setShowPostActionModal(false); startEditing(); }}>Edit</button>
              <button className="btn btn-full"
                style={{ padding: '12px', fontSize: 15, fontWeight: 600, background: '#FEE2E2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)' }}
                onClick={() => { setShowPostActionModal(false); setShowDeleteConfirm(true); }}>Delete</button>
              <button className="btn btn-ghost btn-full" style={{ padding: '12px', fontSize: 15 }}
                onClick={() => setShowPostActionModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '28px 24px 20px' }}>
            <div className="modal-handle" />
            <div style={{ fontSize: 22, marginBottom: 8 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Delete this post?</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>This can't be undone.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-full"
                style={{ padding: '13px', fontSize: 15, fontWeight: 700, background: '#EF4444', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)' }}
                onClick={handleDeletePost}>Yes, delete it</button>
              <button className="btn btn-ghost btn-full" style={{ padding: '13px', fontSize: 15 }}
                onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {lightboxUrl && createPortal(
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
            padding: '16px',
            touchAction: 'pinch-zoom',
          }}
        >
          <img
            src={lightboxUrl}
            alt="Full size"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 12,
              boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
              touchAction: 'pinch-zoom',
              userSelect: 'none',
            }}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '50%', width: 36, height: 36,
              color: '#fff', fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >×</button>
        </div>,
        document.body
      )}
    </>
  );
}
