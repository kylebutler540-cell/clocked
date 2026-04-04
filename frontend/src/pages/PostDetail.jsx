import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import CommentSheet from '../components/CommentSheet';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  const highlightCommentId = location.state?.highlightComment || location.state?.openReplyTo || null;
  const openReplyToId = location.state?.openReplyTo || null;
  const preloadedLikes = location.state?.commentLikes || null;

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(res => setPost(res.data))
      .catch(() => navigate('/'));
  }, [id]);

  // Match the app's current theme background — no hardcoded black
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim() || '#fff';

  const content = (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 900,
      backgroundColor: bg,
    }}>
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
