import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const NotifContext = createContext({ unreadCount: 0, clearUnread: () => {} });

export function NotifProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(() => {
    try { return parseInt(localStorage.getItem('clocked_unread_count') || '0', 10); } catch { return 0; }
  });
  const pollRef = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await api.get('/notifications/unread-count');
      const count = res.data.count ?? 0;
      setUnreadCount(count);
      try { localStorage.setItem('clocked_unread_count', String(count)); } catch {}
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    if (!user?.email) { setUnreadCount(0); return; }

    fetchCount(); // immediate on mount / login

    // Poll every 30 seconds
    pollRef.current = setInterval(fetchCount, 30000);

    // Also refresh when tab becomes visible again
    function onVisible() { if (!document.hidden) fetchCount(); }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, fetchCount]);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
    try { localStorage.setItem('clocked_unread_count', '0'); } catch {}
  }, []);

  return (
    <NotifContext.Provider value={{ unreadCount, clearUnread, refresh: fetchCount }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotif() {
  return useContext(NotifContext);
}
