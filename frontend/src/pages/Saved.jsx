import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { cacheGet, cacheSet, isFresh } from '../lib/cache';

export default function Saved() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }

    const cached = cacheGet('saved-posts');
    if (cached && isFresh('saved-posts')) {
      setPosts(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get('/posts/user/saved')
      .then(res => {
        cacheSet('saved-posts', res.data);
        setPosts(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!user?.email) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔐</div>
        <h3>Sign in to see saved posts</h3>
        <p>Create an account to save and revisit reviews.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/profile')}>
          Go to Profile
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⭐</div>
        <h3>No saved reviews</h3>
        <p>Tap the ☆ on any post to save it for later.</p>
      </div>
    );
  }

  return (
    <div className="saved-page">
      <div className="section-header">Saved Reviews ({posts.length})</div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
