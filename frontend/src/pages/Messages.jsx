import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function ConversationListItem({ conversation, isSelected, onClick }) {
  const { user, lastMessage, unread } = conversation;
  const name = user?.display_name || 'Unknown';
  const preview = lastMessage?.body
    ? (lastMessage.body.length > 55 ? lastMessage.body.slice(0, 55) + '…' : lastMessage.body)
    : 'No messages yet';
  const time = lastMessage ? timeAgo(lastMessage.created_at) : '';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', cursor: 'pointer',
        background: isSelected ? 'var(--purple-glow, rgba(168,85,247,0.08))' : 'transparent',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.15s',
      }}
    >
      <Avatar url={user?.avatar_url} name={name} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: 14, color: 'var(--text-primary)' }}>{name}</div>
        <div style={{
          fontSize: 13, marginTop: 2,
          color: unread > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
          fontWeight: unread > 0 ? 500 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {preview}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{time}</div>
        {unread > 0 && (
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#A855F7' }} />
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
  const lastMsgCountRef = useRef(0);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  const fetchMessages = useCallback(async ({ silent = false } = {}) => {
    try {
      const res = await api.get(`/messages/conversation/${userId}`);
      const data = Array.isArray(res.data) ? res.data : [];

      // Resolve other user from first message if not yet set
      setOtherUser(prev => {
        if (prev) return prev;
        if (data.length > 0) {
          return data[0].sender_id === userId ? data[0].sender : data[0].recipient;
        }
        return prev;
      });

      setMessages(prev => {
        // Merge: replace optimistic messages with confirmed ones, keep any still-sending
        const optimistic = prev.filter(m => m._status === 'sending');
        const confirmed = data;
        // Attach any still-in-flight optimistic msgs that aren't confirmed yet
        const pendingBodies = new Set(confirmed.map(m => m.body + m.created_at?.slice(0, 16)));
        const stillPending = optimistic.filter(m => !pendingBodies.has(m.body + m._sentAt?.slice(0, 16)));
        return [...confirmed, ...stillPending];
      });

      if (!silent) scrollToBottom('auto');

      // Auto-scroll if new messages arrived silently
      if (silent && data.length > lastMsgCountRef.current) {
        scrollToBottom('smooth');
      }
      lastMsgCountRef.current = data.length;
    } catch (err) {
      console.error('fetchMessages error', err);
    } finally {
      setLoading(false);
    }
  }, [userId, scrollToBottom]);

  // Fetch other user profile independently (for empty conversations)
  useEffect(() => {
    api.get(`/auth/user/${userId}`)
      .then(res => setOtherUser(prev => prev || res.data))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(() => fetchMessages({ silent: true }), 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = inputValue.trim();
    if (!body) return;

    const optimisticId = `opt-${Date.now()}`;
    const now = new Date().toISOString();

    const optimisticMsg = {
      id: optimisticId,
      sender_id: currentUser.id,
      recipient_id: userId,
      body,
      created_at: now,
      _sentAt: now,
      _status: 'sending', // 'sending' | 'sent' | 'failed'
    };

    // 1. Immediately show in thread
    setMessages(prev => [...prev, optimisticMsg]);
    setInputValue('');
    scrollToBottom('smooth');

    // 2. Immediately update inbox (bubble to top)
    onMessageSent?.(userId, body, now);

    // 3. Confirm with server
    try {
      const res = await api.post(`/messages/${userId}`, { body });
      // Replace optimistic with confirmed
      setMessages(prev => prev.map(m => m.id === optimisticId ? { ...res.data, _status: 'sent' } : m));
    } catch (err) {
      console.error('send failed', err);
      // Mark as failed
      setMessages(prev => prev.map(m =>
        m.id === optimisticId ? { ...m, _status: 'failed' } : m
      ));
    }

    inputRef.current?.focus();
  };

  const handleRetry = async (msg) => {
    // Reset to sending
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _status: 'sending' } : m));
    try {
      const res = await api.post(`/messages/${userId}`, { body: msg.body });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...res.data, _status: 'sent' } : m));
      onMessageSent?.(userId, msg.body, new Date().toISOString());
    } catch {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _status: 'failed' } : m));
    }
  };

  const otherName = otherUser?.display_name || 'Loading…';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', padding: '4px 8px 4px 0', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {otherUser && <Avatar url={otherUser.avatar_url} name={otherName} size={34} />}
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>{otherName}</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
            <Avatar url={otherUser?.avatar_url} name={otherName} size={56} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>{otherName}</div>
            <div style={{ fontSize: 13 }}>Start the conversation</div>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_id === currentUser?.id;
            const isFailed = msg._status === 'failed';
            const isSending = msg._status === 'sending';

            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '72%',
                    padding: '10px 14px',
                    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isFailed ? '#ef4444' : isOwn ? '#A855F7' : 'var(--bg-card)',
                    border: isOwn ? 'none' : '1px solid var(--border)',
                    color: isOwn ? 'white' : 'var(--text-primary)',
                    fontSize: 14,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    opacity: isSending ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                    cursor: isFailed ? 'pointer' : 'default',
                  }}
                  onClick={isFailed ? () => handleRetry(msg) : undefined}
                  title={isFailed ? 'Tap to retry' : undefined}
                >
                  {msg.body}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isSending && <span>Sending…</span>}
                  {isFailed && <span style={{ color: '#ef4444' }}>Not sent · Tap to retry</span>}
                  {!isSending && !isFailed && <span>{formatTs(msg.created_at)}</span>}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex', gap: 8, padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-primary)', flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="form-input"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Message…"
          style={{ flex: 1 }}
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!inputValue.trim()}
          style={{ padding: '8px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}

// ─── Main Messages Page ───────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(() => searchParams.get('user') || null);
  const inboxPollRef = useRef(null);

  const fetchInbox = useCallback(async ({ silent = false } = {}) => {
    if (!user?.email) return;
    try {
      const res = await api.get('/messages/inbox');
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('inbox fetch error', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInbox();
    // Poll inbox every 10 seconds to keep it fresh
    inboxPollRef.current = setInterval(() => fetchInbox({ silent: true }), 10000);
    return () => clearInterval(inboxPollRef.current);
  }, [fetchInbox]);

  // Called when a message is sent — immediately update inbox without waiting for poll
  const handleMessageSent = useCallback((toUserId, body, sentAt) => {
    setConversations(prev => {
      const existing = prev.find(c => c.user?.id === toUserId);
      if (existing) {
        // Update last message + move to top of its section
        const updated = {
          ...existing,
          lastMessage: { body, created_at: sentAt, sender_id: user?.id },
          unread: 0,
        };
        const rest = prev.filter(c => c.user?.id !== toUserId);
        // Insert at top of its section (friends stay in friends, requests in requests)
        const friends = [updated, ...rest].filter(c => c.isFriend);
        const requests = [updated, ...rest].filter(c => !c.isFriend && c.user?.id !== toUserId);
        return updated.isFriend ? [...friends, ...requests] : [...prev.filter(c => c.isFriend), updated, ...prev.filter(c => !c.isFriend && c.user?.id !== toUserId)];
      }
      // New conversation — add to top of requests (we don't know isFriend yet, re-fetch will correct it)
      return [
        ...prev.filter(c => c.isFriend),
        { user: { id: toUserId }, lastMessage: { body, created_at: sentAt, sender_id: user?.id }, unread: 0, isFriend: false },
        ...prev.filter(c => !c.isFriend),
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

  if (selectedUserId) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <ConversationView
          userId={selectedUserId}
          onBack={() => {
            setSelectedUserId(null);
            fetchInbox(); // refresh inbox on back
          }}
          onMessageSent={handleMessageSent}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 16px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  const friends = conversations.filter(c => c.isFriend);
  const requests = conversations.filter(c => !c.isFriend);

  if (conversations.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <h3>No messages yet</h3>
        <p>Message someone from their profile to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Page header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border)',
        fontWeight: 700, fontSize: 18,
        color: 'var(--text-primary)',
        flexShrink: 0,
      }}>
        Messages
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Friends / mutual follows */}
        {friends.length > 0 && (
          <>
            <div style={{
              padding: '10px 16px 6px',
              fontSize: 11, fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'var(--bg-elevated, var(--bg-primary))',
            }}>
              Messages
            </div>
            {friends.map(conv => (
              <ConversationListItem
                key={conv.user?.id}
                conversation={conv}
                isSelected={selectedUserId === conv.user?.id}
                onClick={() => setSelectedUserId(conv.user?.id)}
              />
            ))}
          </>
        )}

        {/* Requests */}
        {requests.length > 0 && (
          <>
            <div style={{
              padding: '10px 16px 6px',
              fontSize: 11, fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'var(--bg-elevated, var(--bg-primary))',
              borderTop: friends.length > 0 ? '1px solid var(--border)' : 'none',
            }}>
              Message Requests
            </div>
            {requests.map(conv => (
              <ConversationListItem
                key={conv.user?.id}
                conversation={conv}
                isSelected={selectedUserId === conv.user?.id}
                onClick={() => setSelectedUserId(conv.user?.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
