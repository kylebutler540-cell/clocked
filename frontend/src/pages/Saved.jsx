import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { cacheGet, cacheSet, isFresh } from '../lib/cache';

export default function Saved() {
  const [posts, setPosts] = useState(() => cacheGet('saved-posts') || []);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.email) return;
    api.get('/posts/user/saved')
      .then(res => { cacheSet('saved-posts', res.data); setPosts(res.data); })
      .catch(() => {});
  }, [user]);

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
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
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
