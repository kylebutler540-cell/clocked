import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PostCard from './PostCard';

// Module-level cache: survives navigation within the same session
// key = JSON.stringify(filters) → { posts, nextCursor, ts }
const _feedCache = new Map();

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
  body_truncated: false,
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

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes — reasonable freshness without constant refetching

export default function Feed({ filters = {}, employerInfo = null, emptyState = null }) {
  const navigate = useNavigate();
  const isCompanyFeed = !!filters.employer_place_id;
  const isTopRated = filters.sort === 'top';
  // Stable cache key — use useMemo so it doesn't change identity every render
  const cacheKey = React.useMemo(() => JSON.stringify(filters), [JSON.stringify(filters)]); // eslint-disable-line

  // Seed state from cache immediately — no loading flash if we have data
  const [posts, setPosts] = useState(() => _feedCache.get(cacheKey)?.posts || []);
  const [nextCursor, setNextCursor] = useState(() => _feedCache.get(cacheKey)?.nextCursor || null);
  // Only show skeleton if we have zero cached posts
  const [loading, setLoading] = useState(() => !_feedCache.get(cacheKey)?.posts?.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  const isFetchingRef = useRef(false); // prevent duplicate concurrent fetches
  const userCoordsRef = useRef(null); // { lat, lng } if geolocation granted

  const [coordsReady, setCoordsReady] = useState(false);

  // Request geolocation once on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          userCoordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoordsReady(true);
        },
        () => setCoordsReady(true) // denied — proceed without coords
      );
    } else {
      setCoordsReady(true);
    }
  }, []);

  const fetchPosts = useCallback(async (cursor = null) => {
    const params = { ...filters };
    if (cursor) params.cursor = cursor;
    if (userCoordsRef.current) {
      params.userLat = userCoordsRef.current.lat;
      params.userLng = userCoordsRef.current.lng;
    }
    const res = await api.get('/posts', { params });
    return { posts: res.data.posts || [], nextCursor: res.data.nextCursor || null };
  }, [cacheKey]); // eslint-disable-line

  useEffect(() => {
    const cached = _feedCache.get(cacheKey);
    const fresh = cached && (Date.now() - cached.ts < CACHE_TTL);

    if (fresh) {
      // Data is fresh — show it, no fetch needed
      setPosts(cached.posts);
      setNextCursor(cached.nextCursor);
      setLoading(false);
      return;
    }

    // Stale or empty cache — fetch
    // If we already have posts (stale cache), keep showing them during refetch (no skeleton flash)
    if (!cached?.posts?.length) setLoading(true);

    if (isFetchingRef.current) return; // don't double-fetch
    isFetchingRef.current = true;

    fetchPosts()
      .then(({ posts: newPosts, nextCursor: newCursor }) => {
        _feedCache.set(cacheKey, { posts: newPosts, nextCursor: newCursor, ts: Date.now() });
        setPosts(newPosts);
        setNextCursor(newCursor);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        isFetchingRef.current = false;
      });
  }, [fetchPosts, cacheKey, coordsReady]);

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
      setPosts(prev => {
        const merged = [...prev, ...newPosts];
        _feedCache.set(cacheKey, { posts: merged, nextCursor: newCursor, ts: Date.now() });
        return merged;
      });
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
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="feed">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={() => {
            setPosts(prev => {
              const updated = prev.filter(p => p.id !== post.id);
              const existing = _feedCache.get(cacheKey);
              if (existing) _feedCache.set(cacheKey, { ...existing, posts: updated });
              return updated;
            });
          }}
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 20 }} />

      {loadingMore && (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      )}

      {!nextCursor && posts.length === 0 && (
        emptyState ? emptyState : (
          <>
            {/* Show seed posts on home feed only so it never looks empty to new users */}
            {!isCompanyFeed && !isTopRated && !filters.userId && (
              <>
                <PostCard key={MOCK_POST.id} post={MOCK_POST} />
                <PostCard key={MOCK_POST_2.id} post={MOCK_POST_2} />
              </>
            )}
            {(isCompanyFeed || isTopRated || filters.userId) && (
              <div className="feed-first-cta">
                {(isCompanyFeed && filters.search) ? (
                  // Keyword search with no matches
                  <>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:12}}>
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <h3>No posts match your search</h3>
                    <p>Try a different keyword or clear the search to see all reviews.</p>
                  </>
                ) : (
                  // Genuinely empty feed
                  <>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:12}}>
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    <h3>No reviews yet</h3>
                    <p>No one has posted here yet. Share your experience — anonymously — and help others make better decisions.</p>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 16, display: 'inline-block', padding: '12px 24px' }}
                      onClick={() => navigate('/create', employerInfo ? { state: { employer: employerInfo } } : {})}
                    >
                      Write a Review
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )
      )}

      {!nextCursor && posts.length > 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          You've seen all reviews
        </div>
      )}
    </div>
  );
}

// Call after a new post is created to force the home feed to refetch on next mount
export function clearFeedCache() { _feedCache.clear(); }
