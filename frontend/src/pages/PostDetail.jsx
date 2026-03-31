import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import CommentSheet from '../components/CommentSheet';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(true);

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
    <div className="post-detail-page">
      <PostCard post={post} onDelete={() => navigate('/')} />
      <CommentSheet
        postId={id}
        post={post}
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); navigate(-1); }}
      />
    </div>
  );
}
