import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import { timeAgo, generateAnonName } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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

  // Comment edit/delete state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [menuCommentId, setMenuCommentId] = useState(null);
  const longPressTimer = useRef(null);
  const menuRef = useRef(null);

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
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuCommentId(null);
      }
    }
    if (menuCommentId) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuCommentId]);

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/posts/${id}/comments`, { body: commentText.trim() });
      setComments(prev => [...prev, res.data]);
      setCommentText('');
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
    <div>
      <PostCard post={post} onDelete={() => navigate('/')} />

      <div className="divider" />

      {/* Comment input */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <form onSubmit={handleComment} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            className="form-input"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            maxLength={1000}
            style={{ flex: 1, resize: 'none' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '10px 14px', alignSelf: 'flex-end' }}
            disabled={submitting || !commentText.trim()}
          >
            {submitting ? '...' : '↑'}
          </button>
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
                style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}
                onTouchStart={isOwner ? () => handleTouchStart(comment.id) : undefined}
                onTouchEnd={isOwner ? handleTouchEnd : undefined}
                onTouchMove={isOwner ? handleTouchEnd : undefined}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {generateAnonName(comment.anonymous_user_id)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {timeAgo(comment.created_at)}
                    </span>
                    {isOwner && (
                      <div style={{ position: 'relative' }} ref={menuOpen ? menuRef : null}>
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
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {comment.body}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
