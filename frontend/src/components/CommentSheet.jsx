import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { timeAgo, generateAnonName } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const RATING_LABELS = { BAD: '😡 Bad', NEUTRAL: '😐 Neutral', GOOD: '😊 Good' };

function CommentAvatar({ anonNumber, size = 32 }) {
  const initial = anonNumber != null ? String(anonNumber)[0] : 'A';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.4,
    }}>
      {initial}
    </div>
  );
}

function CommentItem({ comment, currentUserId, onReply, onLike, onActionModal, depth = 0 }) {
  const navigate = useNavigate();
  const isOwner = currentUserId && comment.anonymous_user_id === currentUserId;
  const [showReplies, setShowReplies] = useState(true);
  const authorName = comment.author_anon_number != null
    ? `Anonymous ${comment.author_anon_number}`
    : generateAnonName(comment.anonymous_user_id);

  return (
    <div style={{ marginLeft: depth > 0 ? 36 : 0 }}>
      <div style={{ display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'flex-start' }}>
        <button
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate(`/profile/${comment.anonymous_user_id}`)}
        >
          <CommentAvatar anonNumber={comment.author_anon_number} size={depth > 0 ? 26 : 32} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <button
              style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              onClick={() => navigate(`/profile/${comment.anonymous_user_id}`)}
            >
              {authorName}
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(comment.created_at)}</span>
          </div>

          {comment.body && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 4px' }}>
              {comment.body}
            </p>
          )}

          {comment.image_url && (
            <img
              src={comment.image_url}
              alt="Comment attachment"
              style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 4, display: 'block', objectFit: 'contain' }}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button
              style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              onClick={() => onReply(comment)}
            >
              Reply
            </button>
          </div>
        </div>

        {/* Right side: heart + ⋮ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => onLike(comment)}
            style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
            aria-label="Like comment"
          >
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill={comment.liked ? '#EF4444' : 'none'}
              stroke={comment.liked ? '#EF4444' : 'var(--text-muted)'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {comment.likes > 0 && (
              <span style={{ fontSize: 10, color: comment.liked ? '#EF4444' : 'var(--text-muted)', lineHeight: 1 }}>
                {comment.likes}
              </span>
            )}
          </button>

          {isOwner && (
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', fontSize: 16, lineHeight: 1 }}
              onClick={() => onActionModal(comment)}
            >
              ⋮
            </button>
          )}
        </div>
      </div>

      {/* Replies toggle */}
      {comment.replies && comment.replies.length > 0 && (
        <>
          {!showReplies && (
            <button
              style={{ fontSize: 12, color: 'var(--purple)', background: 'none', border: 'none', padding: '2px 16px 6px', cursor: 'pointer', marginLeft: 36 }}
              onClick={() => setShowReplies(true)}
            >
              View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
          {showReplies && (
            <>
              <button
                style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', padding: '0 16px 4px', cursor: 'pointer', marginLeft: 36 }}
                onClick={() => setShowReplies(false)}
              >
                Hide replies
              </button>
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onLike={onLike}
                  onActionModal={onActionModal}
                  depth={depth + 1}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function CommentSheet({ postId, post, isOpen, onClose }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, author_anon_number, anonymous_user_id }
  const [commentActionModal, setCommentActionModal] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');

  const imageInputRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Fetch comments when sheet opens
  useEffect(() => {
    if (!isOpen || !postId) return;
    setLoading(true);
    api.get(`/posts/${postId}/comments`)
      .then(res => setComments(res.data))
      .catch(() => addToast('Failed to load comments'))
      .finally(() => setLoading(false));
  }, [isOpen, postId]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSelectedImage({ file, dataUrl: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!commentText.trim() && !selectedImage) return;
    setSubmitting(true);
    try {
      const payload = {
        body: commentText.trim() || '',
        image_url: selectedImage?.dataUrl || null,
      };
      if (replyingTo) payload.parent_id = replyingTo.id;

      const res = await api.post(`/posts/${postId}/comments`, payload);
      const newComment = res.data;

      if (replyingTo) {
        // Insert as reply into the correct parent
        setComments(prev => prev.map(c => {
          if (c.id === replyingTo.id) {
            return { ...c, replies: [...(c.replies || []), newComment] };
          }
          // Check nested
          if (c.replies) {
            return { ...c, replies: c.replies.map(r =>
              r.id === replyingTo.id ? { ...r, replies: [...(r.replies || []), newComment] } : r
            )};
          }
          return c;
        }));
      } else {
        setComments(prev => [...prev, newComment]);
      }

      setCommentText('');
      setSelectedImage(null);
      setReplyingTo(null);
      // Scroll to bottom
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      addToast(err.response?.status === 401 ? 'Sign in to comment' : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(comment) {
    if (!user) { addToast('Sign in to like comments'); return; }
    const optimisticLiked = !comment.liked;
    const delta = optimisticLiked ? 1 : -1;

    // Optimistic update helper
    function updateComment(list) {
      return list.map(c => {
        if (c.id === comment.id) return { ...c, liked: optimisticLiked, likes: c.likes + delta };
        if (c.replies) return { ...c, replies: updateComment(c.replies) };
        return c;
      });
    }
    setComments(prev => updateComment(prev));

    try {
      const res = await api.post(`/posts/${postId}/comments/${comment.id}/like`);
      function syncComment(list) {
        return list.map(c => {
          if (c.id === comment.id) return { ...c, liked: res.data.liked, likes: res.data.likes };
          if (c.replies) return { ...c, replies: syncComment(c.replies) };
          return c;
        });
      }
      setComments(prev => syncComment(prev));
    } catch {
      // Revert on failure
      function revertComment(list) {
        return list.map(c => {
          if (c.id === comment.id) return { ...c, liked: comment.liked, likes: comment.likes };
          if (c.replies) return { ...c, replies: revertComment(c.replies) };
          return c;
        });
      }
      setComments(prev => revertComment(prev));
      addToast('Failed to like comment');
    }
  }

  async function handleDeleteComment(commentId) {
    setCommentActionModal(null);
    try {
      await api.delete(`/posts/${postId}/comments/${commentId}`);
      function removeComment(list) {
        return list
          .filter(c => c.id !== commentId)
          .map(c => c.replies ? { ...c, replies: removeComment(c.replies) } : c);
      }
      setComments(prev => removeComment(prev));
    } catch {
      addToast('Failed to delete comment');
    }
  }

  function startEditComment(comment) {
    setCommentActionModal(null);
    setEditingCommentId(comment.id);
    setEditText(comment.body);
  }

  async function handleSaveEdit(commentId) {
    if (!editText.trim()) return;
    try {
      const res = await api.put(`/posts/${postId}/comments/${commentId}`, { body: editText.trim() });
      function updateBody(list) {
        return list.map(c => {
          if (c.id === commentId) return { ...c, body: res.data.body };
          if (c.replies) return { ...c, replies: updateBody(c.replies) };
          return c;
        });
      }
      setComments(prev => updateBody(prev));
      setEditingCommentId(null);
    } catch {
      addToast('Failed to update comment');
    }
  }

  const ratingLabel = post ? RATING_LABELS[post.rating_emoji] : '';

  if (!isOpen) return null;

  const totalComments = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1000, transition: 'opacity 300ms ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          zIndex: 1001,
          background: 'var(--bg-card)',
          borderRadius: '16px 16px 0 0',
          display: 'flex', flexDirection: 'column',
          maxHeight: '85vh',
          transform: 'translateY(0)',
          transition: 'transform 300ms ease',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '4px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {totalComments > 0 ? `${totalComments} Comment${totalComments !== 1 ? 's' : ''}` : 'Comments'}
            </span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '4px 8px' }}
            >
              ×
            </button>
          </div>

          {/* Post summary */}
          {post && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{ratingLabel.split(' ')[0]}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {post.employer_name}
                </div>
                {post.header && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {post.header}
                  </div>
                )}
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{ratingLabel.split(' ').slice(1).join(' ')}</span>
            </div>
          )}
        </div>

        {/* Comments list */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div className="spinner" />
            </div>
          ) : comments.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No comments yet. Be the first!
            </div>
          ) : (
            comments.map(comment => (
              editingCommentId === comment.id ? (
                <div key={comment.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <textarea
                    className="form-input"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    style={{ width: '100%', resize: 'none', marginBottom: 8 }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 13 }} onClick={() => handleSaveEdit(comment.id)} disabled={!editText.trim()}>Save</button>
                    <button className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: 13 }} onClick={() => setEditingCommentId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  onReply={c => setReplyingTo(c)}
                  onLike={handleLike}
                  onActionModal={setCommentActionModal}
                />
              )
            ))
          )}
          <div style={{ height: 8 }} />
        </div>

        {/* Input bar */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px', flexShrink: 0, paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}>
          {/* Reply chip */}
          {replyingTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '4px 10px', background: 'var(--purple-glow)', borderRadius: 20, alignSelf: 'flex-start', width: 'fit-content' }}>
              <span style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 600 }}>
                @{replyingTo.author_anon_number != null ? `Anonymous ${replyingTo.author_anon_number}` : generateAnonName(replyingTo.anonymous_user_id)}
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                style={{ background: 'none', border: 'none', color: 'var(--purple)', fontSize: 14, lineHeight: 1, padding: 0, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Image attach */}
            <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: selectedImage ? 'var(--purple)' : 'var(--text-muted)', flexShrink: 0,
              }}
              title="Attach image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>

            {selectedImage && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={selectedImage.dataUrl} alt="Preview" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                <button
                  onClick={() => setSelectedImage(null)}
                  style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, fontSize: 10, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >×</button>
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              className="form-input"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
              maxLength={1000}
              style={{ flex: 1, borderRadius: 20, padding: '8px 14px', fontSize: 14 }}
            />

            <button
              onClick={handleSubmit}
              disabled={submitting || (!commentText.trim() && !selectedImage)}
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: (commentText.trim() || selectedImage) ? '#A855F7' : 'var(--bg-elevated)',
                border: 'none', cursor: (commentText.trim() || selectedImage) ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={commentText.trim() || selectedImage ? '#fff' : 'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Comment action modal */}
      {commentActionModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setCommentActionModal(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '24px 20px 20px' }}>
            <div className="modal-handle" />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>What would you like to do?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-secondary btn-full"
                style={{ padding: '12px', fontSize: 15, fontWeight: 600 }}
                onClick={() => startEditComment(commentActionModal)}
              >
                Edit
              </button>
              <button
                className="btn btn-full"
                style={{ padding: '12px', fontSize: 15, fontWeight: 600, background: '#FEE2E2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)' }}
                onClick={() => handleDeleteComment(commentActionModal.id)}
              >
                Delete
              </button>
              <button
                className="btn btn-ghost btn-full"
                style={{ padding: '12px', fontSize: 15 }}
                onClick={() => setCommentActionModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
