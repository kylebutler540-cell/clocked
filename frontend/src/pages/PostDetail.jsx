import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  // Map of commentId → liked boolean passed from Alerts tab so the sheet shows correct state immediately
  const preloadedLikes = location.state?.commentLikes || null;

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(res => setPost(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!post) return null;

  return (
    <div className="post-detail-page" style={{ position: 'relative', minHeight: '100dvh', background: '#000' }}>
      <PostCard post={post} onDelete={() => navigate('/')} />
      <CommentSheet
        postId={id}
        post={post}
        isOpen={sheetOpen}
        highlightCommentId={highlightCommentId}
        preloadedLikes={preloadedLikes}
        onClose={() => { setSheetOpen(false); navigate(-1); }}
      />
    </div>
  );
}
