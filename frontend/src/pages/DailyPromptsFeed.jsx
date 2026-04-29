import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PromptPostCard from '../components/PromptPostCard';

function getIndustry() {
  return localStorage.getItem('clocked_industry') || 'general';
}

export default function DailyPromptsFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'friends'



  const fetchFeed = useCallback(async (activeFilter) => {
    setLoading(true);
    setError(null);
    try {
      const occupation = getIndustry();
      const res = await api.get('/daily-prompts/feed', { params: { occupation, filter: activeFilter || 'all' } });
      setFeed(res.data);
    } catch {
      setError('Could not load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(filter); }, [fetchFeed]); // eslint-disable-line

  function handleFilterChange(f) {
    setFilter(f);
    fetchFeed(f);
  }

  async function handleReact(occupation, type) {
    if (!user?.email) { navigate('/signup'); return; }
    try {
      const date = feed?.date || new Date().toISOString().slice(0, 10);
      const res = await api.post(`/daily-prompts/feed/${date}/${occupation}/react`, { type });
      setFeed(prev => ({
        ...prev,
        posts: prev.posts.map(p =>
          p.occupation === occupation
            ? {
                ...p,
                likeCount: res.data.likeCount,
                dislikeCount: res.data.dislikeCount,
                saveCount: res.data.saveCount,
                userLiked: res.data.liked,
                userDisliked: res.data.disliked,
                userSaved: res.data.saved,
              }
            : p
        ),
      }));
    } catch { /* silent */ }
  }

  function handleCommentAdded(occupation) {
    setFeed(prev => ({
      ...prev,
      posts: prev.posts.map(p =>
        p.occupation === occupation ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
      ),
    }));
  }

  return (
    <div className="dp-page">
      {/* Header */}
      <div className="dp-header-row">
        <div>
          <div className="dp-title">Today's Prompt</div>
          <div className="dp-subtitle">See how every industry answered</div>
        </div>
        <button
          className="dp-back-btn"
          onClick={() => navigate('/')}
        >
          Home
        </button>
      </div>

      {/* Filter bar */}
      <div className="dpf-filter-bar">
        <button
          className={`dpf-filter-btn${filter === 'all' ? ' active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          🌐 All Industries
        </button>
        <button
          className={`dpf-filter-btn${filter === 'friends' ? ' active' : ''}`}
          onClick={() => handleFilterChange('friends')}
        >
          👥 Friends
        </button>
      </div>

      {loading ? (
        <div className="dp-loading"><div className="spinner" /></div>
      ) : error ? (
        <div className="dp-error">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchFeed}>Try Again</button>
        </div>
      ) : feed ? (
        <div className="dp-feed-section">
          <div className="dp-feed-title">How everyone answered today</div>
          {feed.posts.map(post => (
            <PromptPostCard
              key={post.occupation}
              post={post}
              onReact={(type) => handleReact(post.occupation, type)}
              onCommentAdded={handleCommentAdded}
            />
          ))}
        </div>
      ) : null}

    </div>
  );
}
