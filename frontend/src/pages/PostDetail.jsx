import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import CommentSheet from '../components/CommentSheet';
import { useAuth } from '../context/AuthContext';

const ADMIN_EMAILS = ['kylebutler540@gmail.com', 'clockedreports@gmail.com'];

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const highlightCommentId = location.state?.highlightComment || location.state?.openReplyTo || null;
  const openReplyToId = location.state?.openReplyTo || null;
  const preloadedLikes = location.state?.commentLikes || null;

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(res => setPost(res.data))
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

  // Read the active theme directly from the data-theme attribute — reliable, no async CSS variable lookup
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const bg = isDark ? '#000000' : '#ffffff';

  const content = (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 900,
      backgroundColor: bg,
    }}>
      {isAdmin && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            zIndex: 1000,
            background: deleting ? '#a00' : '#e00',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 700,
            cursor: deleting ? 'not-allowed' : 'pointer',
            opacity: deleting ? 0.7 : 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {deleting ? 'Deleting…' : '🗑 Delete Post'}
        </button>
      )}
      {/* Open sheet immediately — no loading gate. Post loads in background. */}
      <CommentSheet
        postId={id}
        post={post}
        isOpen={sheetOpen}
        highlightCommentId={highlightCommentId}
        openReplyToId={openReplyToId}
        preloadedLikes={preloadedLikes}
        fullscreen={true}
        onClose={() => { setSheetOpen(false); navigate(-1); }}
      />
    </div>
  );

  return createPortal(content, document.body);
}
