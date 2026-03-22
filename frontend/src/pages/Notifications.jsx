import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { timeAgo } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
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

  if (notifications.length === 0) {
    return (
      <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔔</div>
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
