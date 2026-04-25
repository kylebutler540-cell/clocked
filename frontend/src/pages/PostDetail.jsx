import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import CommentSheet from '../components/CommentSheet';
import { updateCommentCount } from '../lib/postStore';
import { useAuth } from '../context/AuthContext';

const ADMIN_EMAILS = ['kylebutler540@gmail.com', 'clockedreports@gmail.com'];

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const highlightCommentId = location.state?.highlightComment || location.state?.openReplyTo || null;
  const openReplyToId = location.state?.openReplyTo || null;
  const preloadedLikes = location.state?.commentLikes || null;

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(res => {
        setPost(res.data);
        // Auto-open comments sheet only when navigating from a notification
        // (notification links carry highlightComment / openReplyTo in location.state)
        if (highlightCommentId || openReplyToId) {
          setShowComments(true);
        }
      })
      .catch(() => navigate('/'));
  }, [id]);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return;
    setDeleting(true);
    try {
      await api.delete(`/posts/${id}`);
      navigate('/');
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleting(false);
    }
  }

  return (
    <div className="post-detail-page" style={{ paddingTop: 16, paddingBottom: 48 }}>

      {/* Admin delete — top right */}
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, paddingRight: 4 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: deleting ? '#a00' : '#e00',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Deleting…' : '🗑 Delete Post'}
          </button>
        </div>
      )}

      {/* Post card or loading spinner */}
      {post ? (
        <PostCard
          post={post}
          onDelete={() => navigate('/')}
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px 16px' }}>
          <div className="spinner" />
        </div>
      )}

      {/* Comments sheet — non-fullscreen, auto-opens for notification deep links */}
      {showComments && createPortal(
        <CommentSheet
          postId={id}
          post={post}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => post && updateCommentCount(post.id, 1)}
          onCommentDeleted={() => post && updateCommentCount(post.id, -1)}
          highlightCommentId={highlightCommentId}
          openReplyToId={openReplyToId}
          preloadedLikes={preloadedLikes}
        />,
        document.body
      )}
    </div>
  );
}
