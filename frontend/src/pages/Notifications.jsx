import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { timeAgo } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    api.get('/notifications')
      .then(res => {
        setNotifications(res.data);
        // Mark all as read
        const unreadIds = res.data.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) {
          api.post('/notifications/read', { ids: unreadIds });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!user?.email) {
    return (
      <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Sign in to see notifications</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>You'll see activity on your posts once you're signed in.</p>
        <a href="/profile" style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--purple)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Sign In
        </a>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>No notifications yet</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>You'll see activity on your posts here.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {notifications.map(n => (
        <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
          {!n.read && <div className="notification-dot" />}
          <div className="notification-text">{n.message}</div>
          <div className="notification-time">{timeAgo(n.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
