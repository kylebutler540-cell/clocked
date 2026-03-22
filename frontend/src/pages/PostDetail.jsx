import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import { timeAgo, generateAnonName } from '../lib/utils';
import { useToast } from '../context/ToastContext';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!post) return null;

  return (
    <div>
      <PostCard post={post} />

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
          comments.map(comment => (
            <div
              key={comment.id}
              style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {generateAnonName(comment.anonymous_user_id)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {timeAgo(comment.created_at)}
                </span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {comment.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
