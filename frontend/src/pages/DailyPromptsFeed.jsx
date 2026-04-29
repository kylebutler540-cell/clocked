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

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const occupation = getIndustry();
      const res = await api.get('/daily-prompts/feed', { params: { occupation } });
      setFeed(res.data);
    } catch {
      setError('Could not load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  async function handleReact(occupation, type) {
    if (!user?.email) { navigate('/signup'); return; }
    try {
      const date = feed?.date || new Date().toISOString().slice(0, 10);
      const res = await api.post(`/daily-prompts/feed/${date}/${occupation}/react`, { type });
      setFeed(prev => ({
        ...prev,
        posts: prev.posts.map(p =>
          p.occupation === occupation
            ? { ...p, likeCount: res.data.likeCount, saveCount: res.data.saveCount, userLiked: res.data.liked, userSaved: res.data.saved }
            : p
        ),
      }));
    } catch { /* silent */ }
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
          onClick={() => navigate('/daily-prompts')}
        >
          ← Back
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
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
