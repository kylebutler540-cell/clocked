import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import CommentSheet from '../components/CommentSheet';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(true);

  // From alert navigation — highlight a specific comment + pre-seed liked state
  const highlightCommentId = location.state?.highlightComment || location.state?.openReplyTo || null;
  const preloadedLikes = location.state?.commentLikes || null;

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(res => setPost(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  // Render as a full-screen portal so it sits above the entire layout
  // — no bleed-through from feed, sidebar, or other background content
  const content = (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 900,
      background: 'var(--bg-base)',
    }}>
      {loading ? (
        <div className="loading-spinner" style={{ paddingTop: 80 }}><div className="spinner" /></div>
      ) : post ? (
        <CommentSheet
          postId={id}
          post={post}
          isOpen={sheetOpen}
          highlightCommentId={highlightCommentId}
          preloadedLikes={preloadedLikes}
          onClose={() => { setSheetOpen(false); navigate(-1); }}
        />
      ) : null}
    </div>
  );

  return createPortal(content, document.body);
}
