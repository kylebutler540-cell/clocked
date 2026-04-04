import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { timeAgo, generateAnonName } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cacheGet, cacheSet } from '../lib/cache';
import PostCard from './PostCard';


function CommentAvatar({ avatarUrl, displayName, size = 32 }) {
  const initial = displayName ? displayName[0].toUpperCase() : 'A';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.4,
      overflow: 'hidden',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial}
    </div>
  );
}

function CommentItem({ comment, currentUserId, onReply, onLike, onActionModal, depth = 0, highlightId,
  editingCommentId, editText, onEditText, onStartEdit, onSaveEdit, onCancelEdit }) {
  const navigate = useNavigate();
  const isOwner = currentUserId && comment.anonymous_user_id === currentUserId;
  const [showReplies, setShowReplies] = useState(true);
  const [highlighted, setHighlighted] = useState(false);
  const itemRef = React.useRef(null);
  const authorName = comment.author_display_name || 'Anonymous';
  const isHighlighted = comment.id === highlightId;
  const isEditing = editingCommentId === comment.id;

  // Scroll to and briefly highlight this comment if it's the target
  React.useEffect(() => {
    if (isHighlighted && itemRef.current) {
      setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlighted(true);
        setTimeout(() => setHighlighted(false), 2500);
      }, 400);
    }
  }, [isHighlighted]);

  const editProps = { editingCommentId, editText, onEditText, onStartEdit, onSaveEdit, onCancelEdit };

  return (
    <div ref={itemRef} style={{ marginLeft: depth > 0 ? 36 : 0, transition: 'background 0.3s ease', background: highlighted ? 'var(--purple-glow)' : 'transparent', borderRadius: highlighted ? 10 : 0 }}>
      {isEditing ? (
        /* Inline edit form — same style as top-level edit */
        <div style={{ padding: '12px 16px' }}>
          <textarea className="form-input" value={editText} onChange={e => onEditText(e.target.value)}
            rows={3} maxLength={1000} style={{ width: '100%', resize: 'none', marginBottom: 8, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', overflow: 'auto' }} autoFocus />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 13 }}
              onClick={() => onSaveEdit(comment.id)} disabled={!editText.trim()}>Save</button>
            <button className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: 13 }}
              onClick={onCancelEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'flex-start' }}>
          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => navigate(`/profile/${comment.anonymous_user_id}`)}>
            <CommentAvatar avatarUrl={comment.author_avatar_url} displayName={comment.author_display_name} size={depth > 0 ? 26 : 32} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <button style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${comment.anonymous_user_id}`)}>
                {authorName}
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(comment.created_at)}</span>
            </div>
            {comment.body && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 4px', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', minWidth: 0 }}>{comment.body}</p>
            )}
            {comment.image_url && (
              <img src={comment.image_url} alt="Comment attachment"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 4, display: 'block', objectFit: 'contain' }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <button style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                onClick={() => onReply(comment)}>
                Reply
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={() => onLike(comment)}
              style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24"
                fill={comment.liked ? '#EF4444' : 'none'}
                stroke={comment.liked ? '#EF4444' : 'var(--text-muted)'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {comment.likes > 0 && (
                <span style={{ fontSize: 10, color: comment.liked ? '#EF4444' : 'var(--text-muted)', lineHeight: 1 }}>{comment.likes}</span>
              )}
            </button>
            {isOwner && (
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', fontSize: 16, lineHeight: 1 }}
                onClick={() => onActionModal(comment)}>
                <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: '-1px', lineHeight: 1 }}>•••</span>
              </button>
            )}
          </div>
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <>
          {!showReplies ? (
            <button style={{ fontSize: 12, color: 'var(--purple)', background: 'none', border: 'none', padding: '2px 16px 6px', cursor: 'pointer', marginLeft: 36 }}
              onClick={() => setShowReplies(true)}>
              View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          ) : (
            <>
              <button style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', padding: '0 16px 4px', cursor: 'pointer', marginLeft: 36 }}
                onClick={() => setShowReplies(false)}>Hide replies</button>
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId}
                  onReply={onReply} onLike={onLike} onActionModal={onActionModal} depth={depth + 1} highlightId={highlightId}
                  {...editProps} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function CommentSheet({ postId, post, isOpen, onClose, highlightCommentId = null, preloadedLikes = null }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentActionModal, setCommentActionModal] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [inputHeight, setInputHeight] = useState(36);
  const [visible, setVisible] = useState(false); // for animation

  const imageInputRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const sheetRef = useRef(null);

  // Animate out smoothly then fire onClose
  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 320);
  }

  // Drag-to-close state
  const dragStartY = useRef(null);
  const dragCurrentY = useRef(0);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      // Small delay so CSS transition fires
      requestAnimationFrame(() => setVisible(true));
    } else {
      // Animate out first, then let parent know we're closed
      setVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!postId) return;

    const cacheKey = 'comments/' + postId;

    // Load from cache first — show immediately, skip loading spinner
    const cached = cacheGet(cacheKey);
    if (cached) {
      // Apply preloaded likes immediately so liked state is correct from first render
      setComments(preloadedLikes
        ? cached.map(c => ({
            ...c,
            liked: preloadedLikes[c.id] !== undefined ? preloadedLikes[c.id] : c.liked,
            replies: c.replies ? c.replies.map(r => ({
              ...r,
              liked: preloadedLikes[r.id] !== undefined ? preloadedLikes[r.id] : r.liked,
            })) : c.replies,
          }))
        : cached
      );
      setLoading(false);
    }

    // Helper: apply preloaded liked states so they show instantly before server responds
    function applyPreloadedLikes(list) {
      if (!preloadedLikes) return list;
      return list.map(c => ({
        ...c,
        liked: preloadedLikes[c.id] !== undefined ? preloadedLikes[c.id] : c.liked,
        replies: c.replies ? c.replies.map(r => ({
          ...r,
          liked: preloadedLikes[r.id] !== undefined ? preloadedLikes[r.id] : r.liked,
        })) : c.replies,
      }));
    }

    // Always revalidate silently
    api.get(`/posts/${postId}/comments`)
      .then(res => {
        const withLikes = applyPreloadedLikes(res.data);
        const changed = JSON.stringify(withLikes) !== JSON.stringify(cached);
        cacheSet(cacheKey, withLikes);
        if (changed) setComments(withLikes);
      })
      .catch(() => {})
      .finally(() => { if (!cached) setLoading(false); });
  }, [postId]);

  // Lock body scroll completely — works on iOS Safari too
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.setAttribute('data-comments-open', 'true');
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.removeAttribute('data-comments-open');
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  // Touch drag-to-close
  function onTouchStart(e) {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }

  function onTouchMove(e) {
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy < 0) return; // only drag down
    dragCurrentY.current = dy;
    if (sheetRef.current) sheetRef.current.style.transform = `translateX(-50%) translateY(${dy}px)`;
  }

  function onTouchEnd() {
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 300ms ease';
    if (dragCurrentY.current > 100) {
      handleClose();
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateX(-50%) translateY(0)';
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  }

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

    // Optimistic comment — show instantly
    const optimisticComment = {
      id: `optimistic-${Date.now()}`,
      post_id: postId,
      anonymous_user_id: user?.id || 'anon',
      author_anon_number: user?.anon_number ?? null,
      body: commentText.trim() || '',
      image_url: selectedImage?.dataUrl || null,
      created_at: new Date().toISOString(),
      likes: 0,
      liked: false,
      replies: [],
      _optimistic: true,
    };

    const capturedText = commentText.trim();
    const capturedImage = selectedImage;
    const capturedReplyingTo = replyingTo;

    setCommentText('');
    setSelectedImage(null);
    setReplyingTo(null);
    setInputHeight(36);

    if (capturedReplyingTo) {
      setComments(prev => prev.map(c => {
        if (c.id === capturedReplyingTo.id) return { ...c, replies: [optimisticComment, ...(c.replies || [])] };
        if (c.replies) return { ...c, replies: c.replies.map(r =>
          r.id === capturedReplyingTo.id ? { ...r, replies: [optimisticComment, ...(r.replies || [])] } : r) };
        return c;
      }));
    } else {
      setComments(prev => [optimisticComment, ...prev]);
    }
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const payload = { body: capturedText || '', image_url: capturedImage?.dataUrl || null };
      if (capturedReplyingTo) payload.parent_id = capturedReplyingTo.id;
      const res = await api.post(`/posts/${postId}/comments`, payload);
      const newComment = res.data;

      // Replace optimistic with real
      const replaceOptimistic = list => list.map(c => {
        if (c.id === optimisticComment.id) return newComment;
        if (c.replies) return { ...c, replies: replaceOptimistic(c.replies) };
        return c;
      });
      setComments(prev => {
        const updated = replaceOptimistic(prev);
        cacheSet('comments/' + postId, updated);
        return updated;
      });
    } catch (err) {
      // Remove optimistic on failure
      const remove = list => list.filter(c => c.id !== optimisticComment.id)
        .map(c => c.replies ? { ...c, replies: remove(c.replies) } : c);
      setComments(prev => remove(prev));
      setCommentText(capturedText);
      setSelectedImage(capturedImage);
      addToast(err.response?.status === 401 ? 'Sign in to comment' : 'Failed to post comment');
    }
  }

  async function handleLike(comment) {
    if (!user) { addToast('Sign in to like comments'); return; }
    const optimisticLiked = !comment.liked;
    const delta = optimisticLiked ? 1 : -1;
    const update = list => list.map(c => {
      if (c.id === comment.id) return { ...c, liked: optimisticLiked, likes: c.likes + delta };
      if (c.replies) return { ...c, replies: update(c.replies) };
      return c;
    });
    setComments(prev => {
      const updated = update(prev);
      cacheSet('comments/' + postId, updated);
      return updated;
    });
    try {
      const res = await api.post(`/posts/${postId}/comments/${comment.id}/like`);
      const sync = list => list.map(c => {
        if (c.id === comment.id) return { ...c, liked: res.data.liked, likes: res.data.likes };
        if (c.replies) return { ...c, replies: sync(c.replies) };
        return c;
      });
      setComments(prev => {
        const updated = sync(prev);
        cacheSet('comments/' + postId, updated);
        return updated;
      });
    } catch {
      const revert = list => list.map(c => {
        if (c.id === comment.id) return { ...c, liked: comment.liked, likes: comment.likes };
        if (c.replies) return { ...c, replies: revert(c.replies) };
        return c;
      });
      setComments(prev => {
        const updated = revert(prev);
        cacheSet('comments/' + postId, updated);
        return updated;
      });
      addToast('Failed to like comment');
    }
  }

  async function handleDeleteComment(commentId) {
    setCommentActionModal(null);
    try {
      await api.delete(`/posts/${postId}/comments/${commentId}`);
      const remove = list => list.filter(c => c.id !== commentId).map(c => c.replies ? { ...c, replies: remove(c.replies) } : c);
      setComments(prev => {
        const updated = remove(prev);
        cacheSet('comments/' + postId, updated);
        return updated;
      });
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
      const update = list => list.map(c => {
        if (c.id === commentId) return { ...c, body: res.data.body };
        if (c.replies) return { ...c, replies: update(c.replies) };
        return c;
      });
      setComments(prev => {
        const updated = update(prev);
        cacheSet('comments/' + postId, updated);
        return updated;
      });
      setEditingCommentId(null);
    } catch {
      addToast('Failed to update comment');
    }
  }

  if (!isOpen) return null;

  const totalComments = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);

  return (
    <>
      {/* Overlay — blocks all background interaction */}
      <div onClick={handleClose} onTouchMove={e => e.preventDefault()} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 1000, opacity: visible ? 1 : 0, transition: 'opacity 300ms ease',
        touchAction: 'none',
      }} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
          transition: 'transform 300ms ease',
          zIndex: 1001,
          background: 'var(--bg-card)',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          height: 'min(92dvh, 92vh)',
          width: '100%',
          maxWidth: '740px', // matches feed width on desktop
          boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle + pinned post header — never scrolls */}
        <div style={{ flexShrink: 0 }}>
          {/* Drag handle — mobile only, tall hit area */}
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="comment-sheet-handle"
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 0 12px', cursor: 'grab', minHeight: 44 }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>

          {/* Full PostCard — pinned at top, full width, capped height */}
          {post && (
            <div
              className="comment-sheet-post"
              style={{ WebkitTapHighlightColor: 'transparent', maxHeight: '30vh', overflowY: 'auto', overscrollBehavior: 'contain' }}
            >
              <PostCard post={post} closeButton={
                <button onClick={handleClose} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 20, lineHeight: 1,
                  padding: '0 4px', display: 'flex', alignItems: 'center', flexShrink: 0,
                }}>×</button>
              } />
            </div>
          )}

          {/* Separator removed */}
        </div>

        {/* Comments list — only this scrolls */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}><div className="spinner" /></div>
          ) : comments.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Be the first to comment!
            </div>
          ) : (
            comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} currentUserId={user?.id}
                onReply={c => setReplyingTo(c)} onLike={handleLike} onActionModal={setCommentActionModal}
                highlightId={highlightCommentId}
                editingCommentId={editingCommentId}
                editText={editText}
                onEditText={setEditText}
                onStartEdit={startEditComment}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingCommentId(null)}
              />
            ))
          )}
          <div style={{ height: 8 }} />
        </div>

        {/* Fixed input bar at bottom */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '8px 12px',
          flexShrink: 0,
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--bg-card)',
        }}>
          {replyingTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '4px 10px', background: 'var(--purple-glow)', borderRadius: 20, width: 'fit-content' }}>
              <span style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 600 }}>
                @{replyingTo.author_display_name || 'Anonymous'}
              </span>
              <button onClick={() => setReplyingTo(null)}
                style={{ background: 'none', border: 'none', color: 'var(--purple)', fontSize: 14, lineHeight: 1, padding: 0, cursor: 'pointer' }}>×</button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
            <button type="button" onClick={() => imageInputRef.current?.click()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: selectedImage ? 'var(--purple)' : 'var(--text-muted)', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            {selectedImage && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={selectedImage.dataUrl} alt="Preview" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                <button onClick={() => setSelectedImage(null)}
                  style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, fontSize: 10, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
              </div>
            )}
            <textarea ref={inputRef} className="form-input" value={commentText}
              onChange={e => {
                setCommentText(e.target.value);
                // Measure natural height, cap at 5 lines (~120px), persist in state
                e.target.style.height = '36px';
                const next = Math.min(e.target.scrollHeight, 120);
                e.target.style.height = next + 'px';
                setInputHeight(next);
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
              maxLength={1600} rows={1}
              style={{ flex: 1, borderRadius: 20, padding: '8px 14px', fontSize: 14, resize: 'none', overflowY: inputHeight >= 120 ? 'auto' : 'hidden', height: inputHeight, minHeight: 36, maxHeight: 120, lineHeight: '1.4', display: 'block', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }} />
            <button onClick={handleSubmit}
              disabled={submitting || (!commentText.trim() && !selectedImage)}
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0, border: 'none',
                background: (commentText.trim() || selectedImage) ? '#A855F7' : 'var(--bg-elevated)',
                cursor: (commentText.trim() || selectedImage) ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={commentText.trim() || selectedImage ? '#fff' : 'var(--text-muted)'}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Comment action modal */}
      {commentActionModal && (
        <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setCommentActionModal(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '24px 20px 20px' }}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button className="btn btn-secondary btn-full" style={{ padding: '12px', fontSize: 15, fontWeight: 600 }}
                onClick={() => startEditComment(commentActionModal)}>Edit</button>
              <button className="btn btn-full"
                style={{ padding: '12px', fontSize: 15, fontWeight: 600, background: '#FEE2E2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)' }}
                onClick={() => handleDeleteComment(commentActionModal.id)}>Delete</button>
              <button className="btn btn-ghost btn-full" style={{ padding: '12px', fontSize: 15 }}
                onClick={() => setCommentActionModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
