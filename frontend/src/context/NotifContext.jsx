import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const NotifContext = createContext({ unreadCount: 0, unreadMessages: 0, clearUnread: () => {}, clearUnreadMessages: () => {} });

export function NotifProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(() => {
    try { return parseInt(localStorage.getItem('clocked_unread_count') || '0', 10); } catch { return 0; }
  });
  const [unreadMessages, setUnreadMessages] = useState(() => {
    try { return parseInt(localStorage.getItem('clocked_unread_messages') || '0', 10); } catch { return 0; }
  });
  const pollRef = useRef(null);
  const msgPollRef = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await api.get('/notifications/unread-count');
      const count = res.data.count ?? 0;
      setUnreadCount(count);
      try { localStorage.setItem('clocked_unread_count', String(count)); } catch {}
    } catch { /* silent */ }
  }, [user]);

  const fetchMessageCount = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await api.get('/messages/unread-count');
      const count = res.data.count ?? 0;
      setUnreadMessages(count);
      try { localStorage.setItem('clocked_unread_messages', String(count)); } catch {}
    } catch { /* silent */ }
  }, [user]);

  // Reset instantly on account switch
  useEffect(() => {
    const handler = () => {
      setUnreadCount(0);
      setUnreadMessages(0);
      try { localStorage.setItem('clocked_unread_count', '0'); } catch {}
      try { localStorage.setItem('clocked_unread_messages', '0'); } catch {}
      clearInterval(pollRef.current);
      clearInterval(msgPollRef.current);
    };
    window.addEventListener('account:switching', handler);
    return () => window.removeEventListener('account:switching', handler);
  }, []);

  useEffect(() => {
    if (!user?.email) { setUnreadCount(0); setUnreadMessages(0); return; }

    fetchCount();
    fetchMessageCount();

    pollRef.current = setInterval(fetchCount, 30000);
    msgPollRef.current = setInterval(fetchMessageCount, 15000); // messages poll more frequently

    function onVisible() {
      if (!document.hidden) {
        fetchCount();
        fetchMessageCount();
      }
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(msgPollRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, fetchCount, fetchMessageCount]);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
    try { localStorage.setItem('clocked_unread_count', '0'); } catch {}
  }, []);

  const clearUnreadMessages = useCallback(() => {
    setUnreadMessages(0);
    try { localStorage.setItem('clocked_unread_messages', '0'); } catch {}
  }, []);

  return (
    <NotifContext.Provider value={{ unreadCount, unreadMessages, clearUnread, clearUnreadMessages, refresh: fetchCount, refreshMessages: fetchMessageCount }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotif() {
  return useContext(NotifContext);
}
