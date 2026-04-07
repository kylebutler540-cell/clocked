import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io as socketIO } from 'socket.io-client';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTs(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ url, name, size = 40 }) {
  const letter = name ? name[0].toUpperCase() : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: url ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', color: '#fff', fontWeight: 700, fontSize: size * 0.38,
      userSelect: 'none',
    }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : letter}
    </div>
  );
}

// ─── Conversation List Item ───────────────────────────────────────────────────

function ConversationListItem({ conversation, onClick }) {
  const { user, lastMessage, unread } = conversation;
  const name = user?.display_name || 'Unknown';
  const preview = lastMessage?.body
    ? (lastMessage.body.length > 50 ? lastMessage.body.slice(0, 50) + '…' : lastMessage.body)
    : 'No messages yet';
  const time = lastMessage?.created_at ? timeAgo(lastMessage.created_at) : '';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 18px', cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        background: 'transparent',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.1s',
      }}
      onTouchStart={e => e.currentTarget.style.background = 'var(--bg-elevated, rgba(168,85,247,0.06))'}
      onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar url={user?.avatar_url} name={name} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: unread > 0 ? 700 : 600,
          fontSize: 15,
          color: 'var(--text-primary)',
          marginBottom: 3,
        }}>{name}</div>
        <div style={{
          fontSize: 13,
          color: unread > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
          fontWeight: unread > 0 ? 500 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {preview}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{time}</div>
        {unread > 0 && (
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#A855F7' }} />
        )}
      </div>
    </div>
  );
}

// ─── Conversation View ────────────────────────────────────────────────────────

function ConversationView({ userId, onBack, onMessageSent }) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const lastCountRef = useRef(0);
  const socketRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  const fetchMessages = useCallback(async (opts = {}) => {
    try {
      const res = await api.get(`/messages/conversation/${userId}`);
      const data = Array.isArray(res.data) ? res.data : [];

      setMessages(prev => {
        // Keep any still-sending optimistic messages
        const sending = prev.filter(m => m._status === 'sending');
        // New data from server
        const newCount = data.length;
        if (!opts.silent) return data;
        // On silent poll, merge: server data + any still in-flight
        const serverIds = new Set(data.map(m => m.id));
        const stillInFlight = sending.filter(m => !serverIds.has(m.id));
        return [...data, ...stillInFlight];
      });

      // Resolve other user
      if (data.length > 0) {
        setOtherUser(prev => prev || (data[0].sender_id === userId ? data[0].sender : data[0].recipient));
      }

      if (!opts.silent) scrollToBottom('auto');
      else if (data.length > lastCountRef.current) scrollToBottom('smooth');
      lastCountRef.current = data.length;
    } catch (err) {
      console.error('fetchMessages', err);
    } finally {
      setLoading(false);
    }
  }, [userId, scrollToBottom]);

  // Load other user profile for empty convos
  useEffect(() => {
    api.get(`/auth/user/${userId}`)
      .then(res => setOtherUser(prev => prev || res.data))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(() => fetchMessages({ silent: true }), 15000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // Socket.io real-time connection
  useEffect(() => {
    if (!currentUser?.id) return;

    const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-production-7798f.up.railway.app';
    const socket = socketIO(API_BASE, {
      auth: { userId: currentUser.id },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('new_message', (msg) => {
      if (msg.sender_id === userId) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom('smooth');
        onMessageSent?.(userId, msg.body, msg.created_at, msg.sender);
      }
    });

    socket.on('message_sent', (msg) => {
      setMessages(prev => prev.map(m =>
        m._status === 'sending' && m.body === msg.body
          ? { ...msg, _status: 'sent' }
          : m
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?.id, userId]); // eslint-disable-line

  // Fix: handle iOS keyboard pushing layout
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        containerRef.current.style.height = `${window.innerHeight}px`;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSend = async (e) => {
    e?.preventDefault();
    const body = inputValue.trim();
    if (!body || !currentUser?.id) return;

    const tmpId = `opt-${Date.now()}`;
    const now = new Date().toISOString();

    const optimisticMsg = {
      id: tmpId,
      sender_id: currentUser.id,
      recipient_id: userId,
      body,
      created_at: now,
      _status: 'sending',
    };

    // Immediately show in thread
    setMessages(prev => [...prev, optimisticMsg]);
    setInputValue('');
    scrollToBottom('smooth');

    // Immediately update inbox
    onMessageSent?.(userId, body, now, otherUser);

    // Send to server
    try {
      const res = await api.post(`/messages/${userId}`, { body });
      setMessages(prev => prev.map(m =>
        m.id === tmpId ? { ...res.data, _status: 'sent' } : m
      ));
    } catch (err) {
      console.error('send error', err?.response?.status, err?.response?.data);
      setMessages(prev => prev.map(m =>
        m.id === tmpId ? { ...m, _status: 'failed' } : m
      ));
    }

    inputRef.current?.focus();
  };

  const handleRetry = async (msg) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _status: 'sending' } : m));
    try {
      const res = await api.post(`/messages/${userId}`, { body: msg.body });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...res.data, _status: 'sent' } : m));
      onMessageSent?.(userId, msg.body, new Date().toISOString(), otherUser);
    } catch {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _status: 'failed' } : m));
    }
  };

  const otherName = otherUser?.display_name || '…';

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100dvh', width: '100%',
        background: 'var(--bg-primary)',
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 200,
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 'env(safe-area-inset-top, 12px) 16px 12px',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        flexShrink: 0, zIndex: 1,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', padding: '4px 8px 4px 0',
            cursor: 'pointer', color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <Avatar url={otherUser?.avatar_url} name={otherName} size={36} />
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', flex: 1 }}>{otherName}</div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        padding: '12px 14px 8px',
        display: 'flex', flexDirection: 'column', gap: 4,
        WebkitOverflowScrolling: 'touch',
      }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', gap: 10, padding: '40px 0',
          }}>
            <Avatar url={otherUser?.avatar_url} name={otherName} size={64} />
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16, marginTop: 4 }}>{otherName}</div>
            <div style={{ fontSize: 14 }}>Send a message to start the conversation</div>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_id === currentUser?.id;
            const isFailed = msg._status === 'failed';
            const isSending = msg._status === 'sending';

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start',
                  marginBottom: 2,
                }}
              >
                <div
                  onClick={isFailed ? () => handleRetry(msg) : undefined}
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: isOwn ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                    background: isFailed ? '#ef4444' : isOwn ? '#A855F7' : 'var(--bg-card)',
                    border: isOwn ? 'none' : '1px solid var(--border)',
                    color: isOwn ? '#fff' : 'var(--text-primary)',
                    fontSize: 15,
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    opacity: isSending ? 0.55 : 1,
                    transition: 'opacity 0.2s',
                    cursor: isFailed ? 'pointer' : 'default',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {msg.body}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text-muted)',
                  marginTop: 3, paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0,
                }}>
                  {isSending && 'Sending…'}
                  {isFailed && <span style={{ color: '#ef4444' }}>Not sent · Tap to retry</span>}
                  {!isSending && !isFailed && formatTs(msg.created_at)}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} style={{ height: 4 }} />
      </div>

      {/* ── Input Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
          placeholder="Message…"
          autoComplete="off"
          style={{
            flex: 1, border: '1px solid var(--border)',
            borderRadius: 24, padding: '10px 16px',
            fontSize: 15, background: 'var(--bg-card)',
            color: 'var(--text-primary)', outline: 'none',
            WebkitAppearance: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          style={{
            width: 42, height: 42, borderRadius: '50%',
            background: inputValue.trim() ? '#A855F7' : 'var(--border)',
            border: 'none', cursor: inputValue.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main Messages Page ───────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuth();
  const { setFullscreen } = useMessaging();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const inboxPollRef = useRef(null);

  // Handle ?user= param on mount only
  useEffect(() => {
    const uid = searchParams.get('user');
    if (uid) openConversation(uid);
  }, []); // eslint-disable-line

  const fetchInbox = useCallback(async (opts = {}) => {
    if (!user?.email) return;
    try {
      const res = await api.get('/messages/inbox');
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('inbox', err);
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInbox();
    inboxPollRef.current = setInterval(() => fetchInbox({ silent: true }), 10000);
    return () => clearInterval(inboxPollRef.current);
  }, [fetchInbox]);

  // Signal app to hide chrome when convo is open
  useEffect(() => {
    setFullscreen(!!selectedUserId);
    return () => setFullscreen(false);
  }, [selectedUserId, setFullscreen]);

  // Make sure chrome is restored on unmount
  useEffect(() => {
    return () => setFullscreen(false);
  }, [setFullscreen]);

  const openConversation = (uid) => {
    setSelectedUserId(uid);
  };

  const closeConversation = () => {
    setSelectedUserId(null);
    fetchInbox();
  };

  // Optimistic inbox update on send
  const handleMessageSent = useCallback((toUserId, body, sentAt, toUser) => {
    setConversations(prev => {
      const existing = prev.find(c => c.user?.id === toUserId);
      const updatedConv = existing
        ? { ...existing, lastMessage: { body, created_at: sentAt, sender_id: user?.id }, unread: 0 }
        : { user: toUser || { id: toUserId }, lastMessage: { body, created_at: sentAt, sender_id: user?.id }, unread: 0, isFriend: false };

      const others = prev.filter(c => c.user?.id !== toUserId);
      const friends = [updatedConv, ...others].filter(c => c.isFriend || c.user?.id === toUserId && updatedConv.isFriend);
      const requests = [updatedConv, ...others].filter(c => !c.isFriend);

      if (updatedConv.isFriend) {
        return [updatedConv, ...others.filter(c => c.user?.id !== toUserId)];
      }
      return [
        ...others.filter(c => c.isFriend),
        updatedConv,
        ...others.filter(c => !c.isFriend && c.user?.id !== toUserId),
      ];
    });
  }, [user]);

  if (!user?.email) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <h3>Sign in to message</h3>
        <p>Create an account to start messaging.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/profile')}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen conversation overlay */}
      {selectedUserId && (
        <ConversationView
          userId={selectedUserId}
          onBack={closeConversation}
          onMessageSent={handleMessageSent}
        />
      )}

      {/* Inbox — always rendered so it stays fresh */}
      <div style={{ display: selectedUserId ? 'none' : 'flex', flexDirection: 'column', minHeight: '60vh' }}>
        {loading ? (
          <div style={{ padding: '80px 16px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <h3>No messages yet</h3>
            <p>Message someone from their profile.</p>
          </div>
        ) : (() => {
          const friends = conversations.filter(c => c.isFriend);
          const requests = conversations.filter(c => !c.isFriend);
          return (
            <>
              {friends.length > 0 && (
                <>
                  <div style={{
                    padding: '10px 18px 6px',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    background: 'var(--bg-elevated, var(--bg-primary))',
                  }}>Messages</div>
                  {friends.map(conv => (
                    <ConversationListItem
                      key={conv.user?.id}
                      conversation={conv}
                      onClick={() => openConversation(conv.user?.id)}
                    />
                  ))}
                </>
              )}
              {requests.length > 0 && (
                <>
                  <div style={{
                    padding: '10px 18px 6px',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    background: 'var(--bg-elevated, var(--bg-primary))',
                    borderTop: friends.length > 0 ? '6px solid var(--bg-elevated, var(--border))' : 'none',
                  }}>Message Requests</div>
                  {requests.map(conv => (
                    <ConversationListItem
                      key={conv.user?.id}
                      conversation={conv}
                      onClick={() => openConversation(conv.user?.id)}
                    />
                  ))}
                </>
              )}
            </>
          );
        })()}
      </div>
    </>
  );
}
