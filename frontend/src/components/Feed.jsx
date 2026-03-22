import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import PostCard from './PostCard';

const MOCK_POST = {
  id: 'mock-seed-post-1',
  anonymous_user_id: '00000000-0000-0000-0000-000000000d3f',
  employer_name: 'Walmart',
  employer_address: '3221 28th St SE, Grand Rapids, MI',
  employer_place_id: 'mock-walmart-grand-rapids',
  rating_emoji: 'BAD',
  header: 'Management is an absolute joke',
  body: 'The store manager on shift literally does nothing but walk around and yell at people. Throws associates under the bus for his own mistakes constantly. We lost 4 good employees in 2 months because of how he treats people. HR does nothing. If you need a job it works but do NOT expect to be treated like a human being. The favoritism is unreal.',
  body_truncated: true,
  likes: 47,
  dislikes: 3,
  comment_count: 12,
  created_at: new Date(Date.now() - 7200000).toISOString(),
  media_urls: [],
  saved: false,
  liked: false,
  disliked: false,
};

export default function Feed({ filters = {} }) {
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const fetchPosts = useCallback(async (cursor = null) => {
    try {
      const params = { ...filters };
      if (cursor) params.cursor = cursor;

      const res = await api.get('/posts', { params });
      return { posts: res.data.posts, nextCursor: res.data.nextCursor };
    } catch (err) {
      throw err;
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    fetchPosts()
      .then(({ posts, nextCursor }) => {
        setPosts(posts);
        setNextCursor(nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchPosts]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [nextCursor, loadingMore]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts: newPosts, nextCursor: newCursor } = await fetchPosts(nextCursor);
      setPosts(prev => [...prev, ...newPosts]);
      setNextCursor(newCursor);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="feed">
      <PostCard key={MOCK_POST.id} post={MOCK_POST} />
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 20 }} />

      {loadingMore && (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      )}

      {!nextCursor && posts.length > 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          You've seen all reviews
        </div>
      )}
    </div>
  );
}
