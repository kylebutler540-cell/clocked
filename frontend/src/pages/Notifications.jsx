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

function ActionIcon({ type }) {
  const icons = {
    like: { bg: '#FEF3C7', color: '#D97706', emoji: '👍' },
    dislike: { bg: '#FEE2E2', color: '#DC2626', emoji: '👎' },
    comment: { bg: '#EDE9FE', color: '#7C3AED', emoji: '💬' },
    reply: { bg: '#EDE9FE', color: '#7C3AED', emoji: '↩️' },
    follow: { bg: '#DCFCE7', color: '#16A34A', emoji: '➕' },
  };
  const icon = icons[type] || { bg: 'var(--bg-elevated)', color: 'var(--text-muted)', emoji: '🔔' };
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', background: icon.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, position: 'absolute', bottom: -2, right: -2,
      border: '1.5px solid var(--bg-card)',
    }}>
      {icon.emoji}
    </div>
  );
}

function NotificationItem({ n, onCommentLike, onCommentReply }) {
  const navigate = useNavigate();
  const data = n.data || {};
  const actorName = data.actor_name || 'Someone';
  const actorAvatar = data.actor_avatar || null;
  const actorId = data.actor_id || null;
  const isComment = n.type === 'comment' || n.type === 'reply';
  const hasPost = !!data.post_id;

  function handleClick() {
    if (!hasPost) return;
    navigate(`/post/${data.post_id}`);
  }

  function handleReply(e) {
    e.stopPropagation();
    if (!hasPost) return;
    navigate(`/post/${data.post_id}`, { state: { openReplyTo: data.comment_id } });
  }

  function handleLikeComment(e) {
    e.stopPropagation();
    if (!data.comment_id) return;
    onCommentLike(n.id, data.post_id, data.comment_id);
  }

  return (
    <div
      style={{
        display: 'flex', gap: 12, padding: '14px 16px',
        background: n.read ? 'transparent' : 'var(--purple-glow)',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
      }}
    >
      {/* Invisible full-row tap target for post navigation — sits behind everything */}
      {hasPost && (
        <div
          onClick={handleClick}
          style={{
            position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 0,
          }}
        />
      )}

      {/* Avatar + action badge — above the tap target */}
      <div style={{ position: 'relative', flexShrink: 0, zIndex: 1 }}>
        <div
          style={{ cursor: actorId ? 'pointer' : 'default' }}
          onClick={actorId ? (e) => { e.stopPropagation(); navigate(`/profile/${actorId}`); } : undefined}
        >
          <Avatar url={actorAvatar} name={actorName} size={44} />
        </div>
        <ActionIcon type={n.type} />
      </div>

      {/* Content — above the tap target */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            <strong
              style={{ fontWeight: 700, cursor: actorId ? 'pointer' : 'default' }}
              onClick={actorId ? (e) => { e.stopPropagation(); navigate(`/profile/${actorId}`); } : undefined}
            >
              {actorName}
            </strong>
            {' '}
            <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
              {n.type === 'like' && 'liked your post'}
              {n.type === 'dislike' && 'disliked your post'}
              {n.type === 'comment' && 'commented on your post'}
              {n.type === 'reply' && 'replied to your comment'}
              {n.type === 'follow' && 'started following you'}
            </span>
            {data.post_header && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                {' — '}<em>{data.post_header}</em>
              </span>
            )}
          </p>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>
            {timeAgo(n.created_at)}
          </span>
        </div>

        {/* Comment body preview */}
        {isComment && data.comment_body && (
          <div style={{
            margin: '6px 0 8px',
            padding: '8px 12px',
            background: 'var(--bg-elevated)',
            borderRadius: 10,
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            borderLeft: '3px solid var(--purple)',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}>
            {data.comment_body.length > 200
              ? data.comment_body.slice(0, 200) + '…'
              : data.comment_body}
          </div>
        )}

        {/* Comment actions */}
        {isComment && data.comment_id && (
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button
              onClick={handleLikeComment}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: n._commentLiked ? 'var(--purple-glow)' : 'var(--bg-elevated)',
                border: `1px solid ${n._commentLiked ? 'var(--purple)' : 'var(--border)'}`,
                color: n._commentLiked ? 'var(--purple)' : 'var(--text-muted)',
                borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={n._commentLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }

    const cached = cacheGet('notifications');
    if (cached && isFresh('notifications')) {
      setNotifications(cached);
      setLoading(false);
    }

    // Always revalidate
    api.get('/notifications')
      .then(res => {
        cacheSet('notifications', res.data);
        setNotifications(res.data);
        const unreadIds = res.data.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) api.post('/notifications/read', { ids: unreadIds });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleCommentLike(notifId, postId, commentId) {
    try {
      await api.post(`/posts/${postId}/comments/${commentId}/like`);
      setNotifications(prev => prev.map(n =>
        n.id === notifId ? { ...n, _commentLiked: !n._commentLiked } : n
      ));
    } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
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
          onCommentReply={() => {}}
        />
      ))}
    </div>
  );
}
