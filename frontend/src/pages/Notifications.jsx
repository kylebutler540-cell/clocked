import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { timeAgo } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { cacheGet, cacheSet, isFresh } from '../lib/cache';

function Avatar({ url, name, size = 40 }) {
  const letter = name ? name[0].toUpperCase() : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: url ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', color: '#fff', fontWeight: 700, fontSize: size * 0.38,
    }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : letter}
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
  const isSimple = n.type === 'like' || n.type === 'dislike' || n.type === 'follow';
  const hasPost = !!data.post_id;
  const postImage = data.post_image || null;

  // Tapping the card navigates to the post, with comment highlighted if applicable
  // Also passes the current liked state so CommentSheet renders it immediately (no flicker)
  function handleCardClick() {
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
    if (actorId) navigate(`/profile/${actorId}`);
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
      onClick={hasPost ? handleCardClick : undefined}
      style={{
        display: 'flex',
        alignItems: isSimple ? 'center' : 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: n.read ? 'transparent' : 'var(--purple-glow)',

        cursor: hasPost ? 'pointer' : 'default',
      }}
    >
      {/* Avatar — separate tap target for profile */}
      <div
        onClick={handleProfileClick}
        style={{ flexShrink: 0, cursor: actorId ? 'pointer' : 'default' }}
      >
        <Avatar url={actorAvatar} name={actorName || '?'} size={44} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, marginRight: postImage ? 8 : 0 }}>

        {/* Top row: text + timestamp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>
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
            </span>
            {isSimple && data.post_header && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                {' — '}<em>{data.post_header}</em>
              </span>
            )}
          </p>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
            {timeAgo(n.created_at)}
          </span>
        </div>

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

      {/* Post image thumbnail — far right, only if post has a photo */}
      {postImage && (
        <img
          src={postImage}
          alt="Post"
          style={{
            width: 52, height: 52, borderRadius: 8, objectFit: 'cover',
            flexShrink: 0, border: '1px solid var(--border)',
          }}
        />
      )}
    </div>
  );
}

export default function Notifications() {
  const cached = cacheGet('notifications') || [];
  const [notifications, setNotifications] = useState(cached);
  const { user } = useAuth();
  const navigate = useNavigate();
  // Track which notification IDs the user has manually liked — skip server overwrites for these
  const userToggledRef = React.useRef(new Set());

  useEffect(() => {
    if (!user?.email) return;

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
        cacheSet('notifications', initial);

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
                cacheSet('notifications', updated); // persist liked state so next visit is instant
                return updated;
              });
            }
          } catch { /* ignore */ }
        });
      })
      .catch(() => {});
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
        cacheSet('notifications', updated);
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
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Sign in to see alerts</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>You'll see activity on your posts once you're signed in.</p>
        <a href="/profile" style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--purple)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Sign In
        </a>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
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
