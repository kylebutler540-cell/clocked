import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { timeAgo } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { cacheGet, cacheSet, isFresh } from '../lib/cache';
import { useNotif } from '../context/NotifContext';

function Avatar({ url, name, size = 40 }) {
  const letter = name ? name[0].toUpperCase() : null;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: url ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', color: '#fff', fontWeight: 700, fontSize: size * 0.38,
    }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : letter
          ? letter
          : <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.85 }}><path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.33 0-10 1.673-10 5v2h20v-2c0-3.327-6.67-5-10-5z"/></svg>
      }
    </div>
  );
}

// ActionIcon removed — alerts rely on text + avatar only

function NotificationItem({ n, onCommentLike }) {
  const navigate = useNavigate();
  const data = n.data || {};
  const actorName = data.actor_name || null;
  const actorAvatar = data.actor_avatar || null;
  const actorId = data.actor_id || null;
  const isComment = n.type === 'comment' || n.type === 'reply';
  const isSimple = n.type === 'like' || n.type === 'dislike';
  const isFollow = n.type === 'follow';
  const isMessageRequest = n.type === 'message_request';
  const hasPost = !!data.post_id;
  const postImage = data.post_image || null;

  const [isFollowingBack, setIsFollowingBack] = useState(data.is_following_back ?? false);
  const [followLoading, setFollowLoading] = useState(false);

  async function handleFollowBack(e) {
    e.stopPropagation();
    if (followLoading || isFollowingBack) return;
    setFollowLoading(true);
    try {
      await api.post(`/follows/${actorId}`);
      setIsFollowingBack(true);
    } catch { /* ignore */ }
    finally { setFollowLoading(false); }
  }

  function handleCardClick() {
    // Message request — navigate to messages
    if (isMessageRequest && actorId) {
      navigate(`/messages?user=${actorId}`);
      return;
    }
    // Follow — navigate to profile
    if (isFollow && actorId) {
      navigate(`/profile/${actorId}`);
      return;
    }
    if (!hasPost) return;
    if (data.comment_id) {
      navigate(`/post/${data.post_id}`, {
        state: {
          highlightComment: data.comment_id,
          commentLikes: {
            [data.comment_id]: {
              liked: n._commentLiked ?? false,
              likes: n._commentLikesCount ?? null,
            },
          },
        },
      });
    } else {
      navigate(`/post/${data.post_id}`);
    }
  }

  function handleProfileClick(e) {
    e.stopPropagation();
    // For message requests, navigate to chat instead of profile
    if (isMessageRequest && actorId) {
      navigate(`/messages?user=${actorId}`);
    } else if (actorId) {
      navigate(`/profile/${actorId}`);
    }
  }

  function handleLikeComment(e) {
    e.stopPropagation();
    if (!data.comment_id) return;
    onCommentLike(n.id, data.post_id, data.comment_id);
  }

  function handleReply(e) {
    e.stopPropagation();
    if (!hasPost) return;
    navigate(`/post/${data.post_id}`, {
      state: {
        openReplyTo: data.comment_id,
        highlightComment: data.comment_id,
        commentLikes: {
          [data.comment_id]: {
            liked: n._commentLiked ?? false,
            likes: n._commentLikesCount ?? null,
          },
        },
      },
    });
  }

  const commentPreview = isComment && data.comment_body
    ? (data.comment_body.length > 120 ? data.comment_body.slice(0, 120) + '…' : data.comment_body)
    : null;

  return (
    <div
      onClick={(hasPost || isMessageRequest || isFollow) ? handleCardClick : undefined}
      style={{
        display: 'flex',
        alignItems: (isSimple || isMessageRequest) ? 'center' : 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: n.read ? 'transparent' : 'var(--purple-glow)',
        cursor: (hasPost || isMessageRequest || isFollow) ? 'pointer' : 'default',
      }}
    >
      {/* Avatar — separate tap target for profile */}
      <div
        onClick={handleProfileClick}
        style={{ flexShrink: 0, cursor: actorId ? 'pointer' : 'default' }}
      >
        <Avatar url={actorAvatar} name={actorName} size={44} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Top row: text + image + timestamp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1, minWidth: 0 }}>
            {actorName && (
              <strong
                onClick={handleProfileClick}
                style={{ fontWeight: 700, cursor: actorId ? 'pointer' : 'default' }}
              >
                {actorName}
              </strong>
            )}
            {actorName && ' '}
            <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
              {n.type === 'like' && 'liked your post'}
              {n.type === 'dislike' && 'disliked your post'}
              {n.type === 'comment' && (commentPreview ? `commented: "${commentPreview}"` : 'commented on your post')}
              {n.type === 'reply' && (commentPreview ? `replied: "${commentPreview}"` : 'replied to your comment')}
              {n.type === 'follow' && 'started following you'}
              {n.type === 'message_request' && (
                <span>wants to message you{data.preview ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{' — "'}{data.preview}{'"'}</span> : ''}</span>
              )}
              {n.type === 'message_accepted' && 'accepted your message request'}
            </span>
            {isSimple && data.post_header && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                {' — '}<em>{data.post_header}</em>
              </span>
            )}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {postImage && (
              <img
                src={postImage}
                alt="Post"
                style={{
                  width: 44, height: 44, borderRadius: 8, objectFit: 'cover',
                  border: '1px solid var(--border)',
                }}
              />
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {timeAgo(n.created_at)}
            </span>
          </div>
        </div>

        {/* Follow back button */}
        {isFollow && actorId && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={handleFollowBack}
              disabled={followLoading || isFollowingBack}
              style={{
                display: 'inline-flex', alignItems: 'center',
                background: isFollowingBack ? 'var(--bg-elevated)' : 'var(--purple)',
                border: isFollowingBack ? '1px solid var(--border)' : 'none',
                color: isFollowingBack ? 'var(--text-muted)' : '#fff',
                borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600,
                cursor: (followLoading || isFollowingBack) ? 'default' : 'pointer',
                opacity: followLoading ? 0.7 : 1,
              }}
            >
              {isFollowingBack ? 'Following' : followLoading ? '…' : 'Follow Back'}
            </button>
          </div>
        )}

        {/* Comment action buttons */}
        {isComment && data.comment_id && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleLikeComment}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24"
                fill={n._commentLiked ? '#ef4444' : 'none'}
                stroke={n._commentLiked ? '#ef4444' : 'currentColor'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Like
            </button>
            <button
              onClick={handleReply}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', borderRadius: 20, padding: '4px 12px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
              </svg>
              Reply
            </button>
          </div>
        )}
      </div>


    </div>
  );
}

export default function Notifications() {
  // Load from localStorage first so page reload is instant with no empty flash
  const getPersistedNotifications = () => {
    try {
      const raw = localStorage.getItem('clocked_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };
  const saveNotifications = (list) => {
    try { localStorage.setItem('clocked_notifications', JSON.stringify(list)); } catch {}
    cacheSet('notifications', list);
  };

  const { user } = useAuth();
  const navigate = useNavigate();
  const { clearUnread } = useNotif();
  const userToggledRef = React.useRef(new Set());

  // Seed from cache ONLY if it belongs to the current user
  const [notifications, setNotifications] = useState(() => {
    // Don't show any persisted data on init — always fetch fresh
    // This prevents cross-account flash
    return [];
  });
  const [fetchLoading, setFetchLoading] = useState(true);

  // Wipe state instantly when account switch starts
  React.useEffect(() => {
    const handler = () => {
      setNotifications([]);
      setFetchLoading(true);
      userToggledRef.current.clear();
    };
    window.addEventListener('account:switching', handler);
    return () => window.removeEventListener('account:switching', handler);
  }, []);

  React.useEffect(() => { clearUnread(); }, []);

  // Poll for new notifications every 30s for cross-device sync
  useEffect(() => {
    if (!user?.email) return;
    const interval = setInterval(() => {
      api.get('/notifications').then(res => {
        const prevCached = cacheGet('notifications') || [];
        const prevLikedMap = Object.fromEntries(prevCached.map(n => [n.id, { liked: n._commentLiked, count: n._commentLikesCount }]));
        setNotifications(prev => {
          const updated = res.data.map(n => ({
            ...n,
            _commentLiked: userToggledRef.current.has(n.id) ? (prev.find(p => p.id === n.id)?._commentLiked ?? false) : (prevLikedMap[n.id]?.liked ?? false),
            _commentLikesCount: prevLikedMap[n.id]?.count ?? null,
          }));
          saveNotifications(updated);
          return updated;
        });
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user?.email) { setFetchLoading(false); return; }

    api.get('/notifications')
      .then(notifs => {
        // Show immediately — no waiting for liked states
        // Preserve any existing liked states from the previous cache so there's no flicker
        const prevCached = cacheGet('notifications') || [];
        const prevLikedMap = Object.fromEntries(prevCached.map(n => [n.id, { liked: n._commentLiked, count: n._commentLikesCount }]));
        const initial = notifs.data.map(n => ({
          ...n,
          _commentLiked: prevLikedMap[n.id]?.liked ?? false,
          _commentLikesCount: prevLikedMap[n.id]?.count ?? null,
        }));
        setNotifications(initial);
        saveNotifications(initial);

        const unreadIds = notifs.data.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) api.post('/notifications/read', { ids: unreadIds }).catch(() => {});

        // Enrich liked states silently in background — only update if user hasn't interacted since load
        const commentNotifs = notifs.data.filter(n => (n.type === 'comment' || n.type === 'reply') && n.data?.comment_id && n.data?.post_id);
        commentNotifs.forEach(async n => {
          try {
            const comments = await api.get(`/posts/${n.data.post_id}/comments`);
            const flat = [];
            const flatten = list => list.forEach(c => { flat.push(c); if (c.replies) flatten(c.replies); });
            flatten(comments.data || []);
            const match = flat.find(c => c.id === n.data.comment_id);
            if (match) {
              setNotifications(prev => {
                const updated = prev.map(x => {
                  if (x.id !== n.id) return x;
                  if (userToggledRef.current.has(n.id)) return x;
                  return { ...x, _commentLiked: match.liked, _commentLikesCount: match.likes };
                });
                saveNotifications(updated);
                return updated;
              });
            }
          } catch { /* ignore */ }
        });
      })
      .catch(() => {})
      .finally(() => setFetchLoading(false));
  }, [user]);

  async function handleCommentLike(notifId, postId, commentId) {
    // Mark as user-toggled so background enrichment won't overwrite it
    userToggledRef.current.add(notifId);
    // Optimistic toggle
    setNotifications(prev => prev.map(n =>
      n.id === notifId ? { ...n, _commentLiked: !n._commentLiked } : n
    ));
    try {
      const res = await api.post(`/posts/${postId}/comments/${commentId}/like`);
      // Sync with actual server state and persist to cache immediately
      setNotifications(prev => {
        const updated = prev.map(n =>
          n.id === notifId ? { ...n, _commentLiked: res.data.liked, _commentLikesCount: res.data.likes } : n
        );
        saveNotifications(updated);
        return updated;
      });
    } catch {
      // Revert on failure
      userToggledRef.current.delete(notifId);
      setNotifications(prev => prev.map(n =>
        n.id === notifId ? { ...n, _commentLiked: !n._commentLiked } : n
      ));
    }
  }

  if (!user?.email) {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Sign in to see alerts</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>You'll see activity on your posts once you're signed in.</p>
        <a href="/signup" style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--purple)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Sign In / Sign Up
        </a>
      </div>
    );
  }

  // Show skeletons while loading — never flash empty state during fetch
  if (fetchLoading && notifications.length === 0) {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '8px 0' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 16px', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '60%', height: 13, borderRadius: 6, background: 'var(--border)', marginBottom: 8 }} />
              <div style={{ width: '40%', height: 11, borderRadius: 6, background: 'var(--border)', opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!fetchLoading && notifications.length === 0) {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>No alerts yet</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Activity on your posts will show up here.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', width: '100%' }}>
      {notifications.map(n => (
        <NotificationItem
          key={n.id}
          n={n}
          onCommentLike={handleCommentLike}
        />
      ))}
    </div>
  );
}
