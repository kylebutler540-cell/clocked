import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import { timeAgo, generateAnonName } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Parse format prefix from comment body
function parseCommentFormat(body) {
  if (body.startsWith('§b§')) return { format: 'bold', text: body.slice(3) };
  if (body.startsWith('§m§')) return { format: 'metallic', text: body.slice(3) };
  if (body.startsWith('§h§')) return { format: 'heading', text: body.slice(3) };
  return { format: null, text: body };
}

function CommentText({ body }) {
  const { format, text } = parseCommentFormat(body);
  if (format === 'bold') {
    return <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, fontWeight: 700 }}>{text}</p>;
  }
  if (format === 'metallic') {
    return (
      <p style={{
        fontSize: 14, lineHeight: 1.5, margin: 0, fontWeight: 600,
        background: 'linear-gradient(135deg, #9CA3AF, #D1D5DB, #6B7280, #E5E7EB)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>{text}</p>
    );
  }
  if (format === 'heading') {
    return <p style={{ fontSize: 17, color: 'var(--text-primary)', lineHeight: 1.35, margin: 0, fontWeight: 700 }}>{text}</p>;
  }
  return <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{text}</p>;
}

function CommentAvatar() {
  return (
    <div style={{
      width: 26,
      height: 26,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="none">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Rich comment tools state
  const [selectedImage, setSelectedImage] = useState(null); // { file, dataUrl }
  const [lightboxImage, setLightboxImage] = useState(null);
  const imageInputRef = useRef(null);

  // Comment edit/delete state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [menuCommentId, setMenuCommentId] = useState(null);
  const longPressTimer = useRef(null);
  const menuRefs = useRef({});

  useEffect(() => {
    Promise.all([
      api.get(`/posts/${id}`),
      api.get(`/posts/${id}/comments`),
    ])
      .then(([postRes, commentsRes]) => {
        setPost(postRes.data);
        setComments(commentsRes.data);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  // Close comment menu on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (menuRefs.current[menuCommentId] && !menuRefs.current[menuCommentId].contains(e.target)) {
        setMenuCommentId(null);
      }
    }
    if (menuCommentId) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuCommentId]);

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSelectedImage({ file, dataUrl: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim() && !selectedImage) return;
    setSubmitting(true);
    try {
      const body = commentText.trim();
      const res = await api.post(`/posts/${id}/comments`, { body: body || '', image_url: selectedImage?.dataUrl || null });
      setComments(prev => [...prev, res.data]);
      setCommentText('');
      setSelectedImage(null);
    } catch {
      addToast('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  function startEditComment(comment) {
    setMenuCommentId(null);
    setEditingCommentId(comment.id);
    setEditText(comment.body);
  }

  async function handleSaveComment(commentId) {
    if (!editText.trim()) return;
    try {
      const res = await api.put(`/posts/${id}/comments/${commentId}`, { body: editText.trim() });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, body: res.data.body } : c));
      setEditingCommentId(null);
    } catch {
      addToast('Failed to update comment');
    }
  }

  async function handleDeleteComment(commentId) {
    setMenuCommentId(null);
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/posts/${id}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {
      addToast('Failed to delete comment');
    }
  }

  function handleTouchStart(commentId) {
    longPressTimer.current = setTimeout(() => {
      setMenuCommentId(commentId);
    }, 500);
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer.current);
  }

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!post) return null;

  return (
    <div className="post-detail-page">
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button
            onClick={() => setLightboxImage(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#fff', fontSize: 28, lineHeight: 1, cursor: 'pointer', padding: '4px 8px' }}
          >×</button>
          <img
            src={lightboxImage}
            alt="Full size"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      )}
      {/* Reactions (like/dislike/save) in PostCard update the module-level reaction cache.
          When the user navigates back to the home feed, each PostCard re-reads from that
          cache on mount — so reaction state stays consistent without touching the feed cache. */}
      <PostCard post={post} onDelete={() => navigate('/')} />

      <div className="divider" />

      {/* Comment input */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <form onSubmit={handleComment}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <textarea
              className="form-input"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  setCommentText(t => t + '\n');
                }
              }}
              placeholder="Add a comment..."
              maxLength={1000}
              rows={2}
              style={{ flex: 1, resize: 'none' }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '8px 14px', flexShrink: 0 }}
              disabled={submitting || (!commentText.trim() && !selectedImage)}
            >
              {submitting ? '...' : '↑'}
            </button>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 6, marginTop: 7, alignItems: 'center' }}>
            {/* Image upload */}
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 6,
                fontSize: 12, color: selectedImage ? 'var(--purple)' : 'var(--text-muted)',
                background: selectedImage ? 'var(--purple-glow)' : 'var(--bg-elevated)',
                border: `1px solid ${selectedImage ? 'var(--purple)' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}
              title="Attach image"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              {selectedImage ? 'Image ✓' : 'Image'}
            </button>

            {selectedImage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 2 }}>
                <img src={selectedImage.dataUrl} alt="Preview" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                >×</button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Comments */}
      <div>
        {comments.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No comments yet. Start the conversation.
          </div>
        ) : (
          comments.map(comment => {
            const isOwner = user?.id && comment.anonymous_user_id === user.id;
            const isEditing = editingCommentId === comment.id;
            const menuOpen = menuCommentId === comment.id;

            return (
              <div
                key={comment.id}
                style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}
                onTouchStart={isOwner ? () => handleTouchStart(comment.id) : undefined}
                onTouchEnd={isOwner ? handleTouchEnd : undefined}
                onTouchMove={isOwner ? handleTouchEnd : undefined}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CommentAvatar />
                    <button
                      style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                      onClick={() => navigate(`/profile/${comment.anonymous_user_id}`)}
                    >
                      {comment.author_anon_number != null ? `Anonymous ${comment.author_anon_number}` : generateAnonName(comment.anonymous_user_id)}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {timeAgo(comment.created_at)}
                    </span>
                    {isOwner && (
                      <div style={{ position: 'relative' }} ref={el => { if (el) menuRefs.current[comment.id] = el; }}>
                        <button
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', padding: '2px 4px',
                            fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center',
                          }}
                          onClick={() => setMenuCommentId(menuOpen ? null : comment.id)}
                        >
                          ⋮
                        </button>
                        {menuOpen && (
                          <div style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 200,
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            borderRadius: 8, padding: '4px 0', minWidth: 160,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          }}>
                            <button
                              className="topbar-dropdown-item"
                              onClick={() => startEditComment(comment)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Edit Comment
                            </button>
                            <button
                              className="topbar-dropdown-item"
                              style={{ color: '#EF4444' }}
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                              Delete Comment
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div>
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
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: 13 }}
                        onClick={() => handleSaveComment(comment.id)}
                        disabled={!editText.trim()}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px 16px', fontSize: 13 }}
                        onClick={() => setEditingCommentId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CommentText body={comment.body} />
                    {comment.image_url && (
                      <img
                        src={comment.image_url}
                        alt="Comment attachment"
                        onClick={() => setLightboxImage(comment.image_url)}
                        style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginTop: 8, objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
