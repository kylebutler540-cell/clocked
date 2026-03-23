import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import PostCard from './PostCard';

function SkeletonCard() {
  return (
    <div className="post-card skeleton-card">
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <div className="skeleton-block" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-block" style={{ width: '40%', height: 12, borderRadius: 6, marginBottom: 6 }} />
          <div className="skeleton-block" style={{ width: '60%', height: 10, borderRadius: 6 }} />
        </div>
      </div>
      <div className="skeleton-block" style={{ width: '70%', height: 14, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton-block" style={{ width: '100%', height: 10, borderRadius: 6, marginBottom: 5 }} />
      <div className="skeleton-block" style={{ width: '85%', height: 10, borderRadius: 6, marginBottom: 5 }} />
      <div className="skeleton-block" style={{ width: '55%', height: 10, borderRadius: 6 }} />
    </div>
  );
}

const MOCK_POST = {
  id: 'mock-seed-post-1',
  anonymous_user_id: '00000000-0000-0000-0000-000000000d3f',
  employer_name: 'Walmart Supercenter',
  employer_address: '5859 28th St SE, Grand Rapids, MI 49546',
  employer_place_id: 'ChIJgUYJpuBNGIgR8PGiUfuZkEs',
  rating_emoji: 'BAD',
  header: 'Management is an absolute joke',
  body: 'The store manager on shift literally does nothing but walk around and yell at people. Throws associates under the bus for his own mistakes constantly. We lost 4 good employees in 2 months because of how he treats people. HR does nothing. If you need a job it works but do NOT expect to be treated like a human being. The favoritism is unreal.',
  body_truncated: true,
  likes: 0,
  dislikes: 0,
  comment_count: 0,
  created_at: new Date(Date.now() - 7200000).toISOString(),
  media_urls: [],
  saved: false,
  liked: false,
  disliked: false,
};

const MOCK_POST_2 = {
  id: 'mock-seed-post-2',
  anonymous_user_id: '00000000-0000-0000-0000-000000000a7c',
  employer_name: 'Amazon Delivery Station DGR6',
  employer_address: '3951 Trade Dr, Grand Rapids, MI 49508',
  employer_place_id: 'ChIJkZmEyWCzGYgRaxvWpapOX7I',
  rating_emoji: 'NEUTRAL',
  header: 'Warehouse conditions during peak season',
  body: 'The pace is brutal during Q4. Mandatory overtime every single week, no exceptions. The pay is decent but your body pays for it. Took these photos of our "break room" — make your own judgement.',
  body_truncated: false,
  likes: 0,
  dislikes: 0,
  comment_count: 0,
  created_at: new Date(Date.now() - 18000000).toISOString(),
  media_urls: ['https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&q=80'],
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
      <div className="feed">
        {!filters.employer_place_id && <PostCard key={MOCK_POST.id} post={MOCK_POST} />}
        {!filters.employer_place_id && <PostCard key={MOCK_POST_2.id} post={MOCK_POST_2} />}
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  // Only show mock posts on the main feed, not on company-specific pages
  const showMockPosts = !filters.employer_place_id;

  // Filter mock posts by rating if a rating filter is active
  const filteredMock1 = showMockPosts && (!filters.rating || filters.rating === MOCK_POST.rating_emoji) ? MOCK_POST : null;
  const filteredMock2 = showMockPosts && (!filters.rating || filters.rating === MOCK_POST_2.rating_emoji) ? MOCK_POST_2 : null;

  return (
    <div className="feed">
      {filteredMock1 && <PostCard key={MOCK_POST.id} post={MOCK_POST} />}
      {filteredMock2 && <PostCard key={MOCK_POST_2.id} post={MOCK_POST_2} />}
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

      {!nextCursor && posts.length === 0 && (
        <div className="feed-first-cta">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:12}}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <h3>Be the first to review a workplace near you</h3>
          <p>No one has posted here yet. Share your experience — anonymously — and help others make better decisions.</p>
          <a href="/create" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block', padding: '12px 24px' }}>
            Write a Review
          </a>
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
