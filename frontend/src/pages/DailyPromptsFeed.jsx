import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // Comments sheet
  const [commentSheet, setCommentSheet] = useState(null); // { occupation, date }
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentInputRef = useRef(null);

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

  async function openComments(occupation) {
    if (!feed) return;
    const date = feed.date;
    setCommentSheet({ occupation, date });
    setComments([]);
    setCommentInput('');
    setCommentsLoading(true);
    try {
      const res = await api.get(`/daily-prompts/feed/${date}/${occupation}/comments`);
      setComments(res.data.comments || []);
    } catch { /* silent */ } finally {
      setCommentsLoading(false);
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  }

  async function submitComment() {
    if (!user?.email) { navigate('/signup'); return; }
    if (!commentInput.trim() || commentSubmitting || !commentSheet) return;
    setCommentSubmitting(true);
    try {
      const res = await api.post(
        `/daily-prompts/feed/${commentSheet.date}/${commentSheet.occupation}/comments`,
        { body: commentInput.trim() }
      );
      setComments(prev => [...prev, res.data.comment]);
      setCommentInput('');
      // Update comment count on the card
      setFeed(prev => ({
        ...prev,
        posts: prev.posts.map(p =>
          p.occupation === commentSheet.occupation
            ? { ...p, commentCount: (p.commentCount || 0) + 1 }
            : p
        ),
      }));
    } catch { /* silent */ } finally {
      setCommentSubmitting(false);
    }
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
              onComment={() => openComments(post.occupation)}
            />
          ))}
        </div>
      ) : null}
    </div>

      {/* Comment Sheet */}
      {commentSheet && (
        <div className="ppc-comment-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCommentSheet(null); }}>
          <div className="ppc-comment-sheet">
            <div className="ppc-comment-header">
              <span className="ppc-comment-title">Comments</span>
              <button className="ppc-comment-close" onClick={() => setCommentSheet(null)}>✕</button>
            </div>
            <div className="ppc-comment-list">
              {commentsLoading && <div className="ppc-comment-loading"><div className="spinner" /></div>}
              {!commentsLoading && comments.length === 0 && (
                <div className="ppc-comment-empty">No comments yet. Be the first!</div>
              )}
              {comments.map(c => (
                <div key={c.id} className="ppc-comment-item">
                  <span className="ppc-comment-anon">#{c.anon_number || '?'}</span>
                  <span className="ppc-comment-body">{c.body}</span>
                </div>
              ))}
            </div>
            <div className="ppc-comment-input-row">
              <input
                ref={commentInputRef}
                className="ppc-comment-input"
                placeholder="Add a comment…"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                maxLength={500}
              />
              <button
                className="ppc-comment-send"
                onClick={submitComment}
                disabled={!commentInput.trim() || commentSubmitting}
              >
                {commentSubmitting ? '…' : '→'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
