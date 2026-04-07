import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';

// ─── Timestamp helpers ────────────────────────────────────────────────────────

function formatMsgTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  // Same day → show time only
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 5) return `${diffWeeks}w`;
  if (diffMonths < 12) return `${diffMonths}m`;
  return `${Math.floor(diffMonths / 12)}y`;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}m`;
  return `${Math.floor(diffMonths / 12)}y`;
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

// Skeleton avatar for loading state (fix #5)
function AvatarSkeleton({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ─── Conversation List Item ───────────────────────────────────────────────────

function ConversationListItem({ conversation, onClick, isSentByMe }) {
  const { user, lastMessage, unread } = conversation;
  const name = user?.display_name || 'Unknown';

  let preview = 'No messages yet';
  if (lastMessage?.body) {
    const body = lastMessage.body.length > 50 ? lastMessage.body.slice(0, 50) + '…' : lastMessage.body;
    preview = isSentByMe ? `You: ${body}` : body;
  }
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
      }}
      onTouchStart={e => e.currentTarget.style.background = 'rgba(168,85,247,0.06)'}
      onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar url={user?.avatar_url} name={name} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 3 }}>
          {name}
        </div>
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

// ─── Conversation Header Skeleton (fix #5 — no blank flash) ──────────────────

function ConvoHeaderSkeleton({ onBack }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px',
      paddingTop: 'max(env(safe-area-inset-top), 12px)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-primary)', flexShrink: 0,
    }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', padding: '4px 8px 4px 0', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <AvatarSkeleton size={36} />
      <div style={{ width: 100, height: 16, borderRadius: 8, background: 'var(--border)' }} />
    </div>
  );
}

// ─── Conversation View ────────────────────────────────────────────────────────

function ConversationView({ userId, initialUser, onBack, onMessageSent }) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  // Fix #5: seed with initialUser so header is never blank
  const [otherUser, setOtherUser] = useState(initialUser || null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);
  const lastCountRef = useRef(0);
  const isInputFocusedRef = useRef(false);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const fetchMessages = useCallback(async (opts = {}) => {
    try {
      const res = await api.get(`/messages/conversation/${userId}`);
      const data = Array.isArray(res.data) ? res.data : [];

      setMessages(prev => {
        if (!opts.silent) return data;
        const serverIds = new Set(data.map(m => m.id));
        const stillInFlight = prev.filter(m => m._status === 'sending' && !serverIds.has(m.id));
        return [...data, ...stillInFlight];
      });

      if (data.length > 0 && !otherUser) {
        const other = data[0].sender_id === userId ? data[0].sender : data[0].recipient;
        setOtherUser(other);
      }

      const isNewMessages = data.length > lastCountRef.current;
      if (!opts.silent) {
        scrollToBottom('auto');
      } else if (isNewMessages && !isInputFocusedRef.current) {
        scrollToBottom('smooth');
      }
      lastCountRef.current = data.length;
    } catch (err) {
      console.error('fetchMessages', err);
    } finally {
      setLoading(false);
    }
  }, [userId, otherUser, scrollToBottom]);

  // Fetch otherUser if not seeded
  useEffect(() => {
    if (!otherUser) {
      api.get(`/auth/user/${userId}`)
        .then(res => setOtherUser(prev => prev || res.data))
        .catch(() => {});
    }
  }, [userId, otherUser]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(() => fetchMessages({ silent: true }), 10000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // ── Keyboard lift: move the whole convo container to sit above the keyboard ──
  const outerRef = useRef(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let lastHeight = vv.height;

    const update = () => {
      const outer = outerRef.current;
      if (!outer) return;

      const kbHeight = window.innerHeight - vv.height - vv.offsetTop;
      // Lift the container above the keyboard
      outer.style.height = `${vv.height}px`;
      outer.style.top = `${vv.offsetTop}px`;

      const isKeyboardOpen = vv.height < lastHeight - 50;
      if (isKeyboardOpen || kbHeight > 50) {
        // Scroll messages to bottom so latest msg stays visible
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        });
      }
      lastHeight = vv.height;
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
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

    setMessages(prev => [...prev, optimisticMsg]);
    setInputValue('');
    scrollToBottom('smooth');
    onMessageSent?.(userId, body, now, otherUser);

    try {
      const res = await api.post(`/messages/${userId}`, { body });
      setMessages(prev => prev.map(m => m.id === tmpId ? { ...res.data, _status: 'sent' } : m));
    } catch (err) {
      console.error('send error', err?.response?.data);
      setMessages(prev => prev.map(m => m.id === tmpId ? { ...m, _status: 'failed' } : m));
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

  const otherName = otherUser?.display_name || null;

  // Fix #3/#4: show "pending" notice if this is a non-mutual sent message
  // We determine this from the inbox isFriend state passed via initialUser
  const isPendingRequest = messages.length > 0
    && messages.every(m => m.sender_id === currentUser?.id)
    && !initialUser?.isFriend;

  return (
    <div
      ref={outerRef}
      style={{
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '100dvh',
        background: 'var(--bg-primary)', zIndex: 200,
        // Prevent the page from scrolling behind this overlay
        overflow: 'hidden',
        // Ensure it sits in the visual viewport on iOS
        willChange: 'height, top',
      }}>
      {/* ── Header ── */}
      {/* Fix #5: show skeleton only if name unknown, never blank */}
      {otherName === null ? (
        <ConvoHeaderSkeleton onBack={onBack} />
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-primary)',
          flexShrink: 0, zIndex: 1,
        }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', padding: '4px 8px 4px 0', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <Avatar url={otherUser?.avatar_url} name={otherName} size={36} />
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', flex: 1 }}>{otherName}</div>
        </div>
      )}

      {/* ── Messages ── */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1, minHeight: 0,
          overflowY: 'auto', overflowX: 'hidden',
          padding: '12px 14px 8px',
          display: 'flex', flexDirection: 'column', gap: 4,
          WebkitOverflowScrolling: 'touch',
          // Fix #1: do NOT use scroll-behavior:smooth on container — let JS control it
        }}
      >
        {loading ? (
          // Fix #5: message skeleton instead of spinner
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
            {[60, 40, 80, 50, 70].map((w, i) => (
              <div key={i} style={{
                alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start',
                width: `${w}%`, height: 40, borderRadius: 20,
                background: 'var(--border)', opacity: 0.5,
              }} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 10, padding: '40px 0' }}>
            {otherUser ? <Avatar url={otherUser.avatar_url} name={otherName} size={64} /> : <AvatarSkeleton size={64} />}
            {otherName && <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16, marginTop: 4 }}>{otherName}</div>}
            <div style={{ fontSize: 14 }}>Send a message to start the conversation</div>
          </div>
        ) : (
          <>
            {messages.map(msg => {
              const isOwn = msg.sender_id === currentUser?.id;
              const isFailed = msg._status === 'failed';
              const isSending = msg._status === 'sending';

              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
                  <div
                    onClick={isFailed ? () => handleRetry(msg) : undefined}
                    style={{
                      maxWidth: '75%',
                      padding: '10px 14px',
                      borderRadius: isOwn ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                      background: isFailed ? '#ef4444' : isOwn ? '#A855F7' : 'var(--bg-card)',
                      border: isOwn ? 'none' : '1px solid var(--border)',
                      color: isOwn ? '#fff' : 'var(--text-primary)',
                      fontSize: 15, lineHeight: 1.4,
                      wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                      opacity: isSending ? 0.55 : 1,
                      transition: 'opacity 0.2s',
                      cursor: isFailed ? 'pointer' : 'default',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {msg.body}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
                    {isSending && 'Sending…'}
                    {isFailed && <span style={{ color: '#ef4444' }}>Not sent · Tap to retry</span>}
                    {!isSending && !isFailed && formatMsgTime(msg.created_at)}
                  </div>
                </div>
              );
            })}

            {/* Fix #3: pending request notice for sender */}
            {isPendingRequest && (
              <div style={{
                textAlign: 'center', fontSize: 12,
                color: 'var(--text-muted)', padding: '12px 20px',
                background: 'var(--bg-elevated, rgba(168,85,247,0.06))',
                borderRadius: 12, margin: '8px 0',
              }}>
                Message request sent · Waiting for them to accept
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} style={{ height: 1 }} />
      </div>

      {/* ── Input Bar ── */}
      {/* Fix #1: input bar uses position sticky-to-bottom via flex, not fixed */}
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
          // Fix #1: on focus, scroll to bottom smoothly without jarring jump
          onFocus={() => {
            isInputFocusedRef.current = true;
            // Small delay lets iOS finish keyboard animation before we scroll
            setTimeout(() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
              }
            }, 100);
          }}
          onBlur={() => { isInputFocusedRef.current = false; }}
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
            flexShrink: 0, transition: 'background 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" />
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
  const [selectedUser, setSelectedUser] = useState(null); // Fix #5: pass user object to convo
  const inboxPollRef = useRef(null);

  // Handle ?user= param on mount only
  useEffect(() => {
    const uid = searchParams.get('user');
    if (uid) openConversation(uid, null);
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

  useEffect(() => {
    setFullscreen(!!selectedUserId);
    return () => setFullscreen(false);
  }, [selectedUserId, setFullscreen]);

  useEffect(() => {
    return () => setFullscreen(false);
  }, [setFullscreen]);

  // Fix #6: listen for BottomNav tap while in convo
  useEffect(() => {
    const handler = () => closeConversation();
    window.addEventListener('messages:close-convo', handler);
    return () => window.removeEventListener('messages:close-convo', handler);
  }, []); // eslint-disable-line

  // Fix #6: expose a way for BottomNav to close the convo
  // We do this by watching for navigation to /messages while in a convo
  // — handled in BottomNav below by resetting selectedUserId via MessagingContext

  const openConversation = (uid, convUser) => {
    setSelectedUserId(uid);
    setSelectedUser(convUser || null);
  };

  const closeConversation = () => {
    setSelectedUserId(null);
    setSelectedUser(null);
    fetchInbox();
  };

  // Fix #3/#4: sender's own sent conversations never go to requests
  // The backend already returns isFriend=false for non-mutual, but we override:
  // if the last message was sent BY us, it always shows in main messages for us
  const processedConversations = conversations.map(conv => {
    const sentByMe = conv.lastMessage?.sender_id === user?.id;
    return {
      ...conv,
      // Sender never sees their outgoing thread as a request
      _showAsRequest: !conv.isFriend && !sentByMe,
    };
  });

  const handleMessageSent = useCallback((toUserId, body, sentAt, toUser) => {
    setConversations(prev => {
      const existing = prev.find(c => c.user?.id === toUserId);
      const updatedConv = existing
        ? { ...existing, lastMessage: { body, created_at: sentAt, sender_id: user?.id }, unread: 0 }
        : { user: toUser || { id: toUserId }, lastMessage: { body, created_at: sentAt, sender_id: user?.id }, unread: 0, isFriend: false };

      const others = prev.filter(c => c.user?.id !== toUserId);
      if (updatedConv.isFriend) {
        return [updatedConv, ...others];
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

  const friends = processedConversations.filter(c => c.isFriend || (!c._showAsRequest));
  const requests = processedConversations.filter(c => c._showAsRequest);

  return (
    <>
      {/* Fullscreen conversation */}
      {selectedUserId && (
        <ConversationView
          userId={selectedUserId}
          initialUser={selectedUser ? { ...selectedUser, isFriend: conversations.find(c => c.user?.id === selectedUserId)?.isFriend } : null}
          onBack={closeConversation}
          onMessageSent={handleMessageSent}
        />
      )}

      {/* Inbox */}
      <div style={{ display: selectedUserId ? 'none' : 'flex', flexDirection: 'column', minHeight: '60vh' }}>
        {loading ? (
          // Fix #5: skeleton list instead of spinner
          <div style={{ padding: '8px 0' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
                <AvatarSkeleton size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '40%', height: 14, borderRadius: 7, background: 'var(--border)', marginBottom: 8 }} />
                  <div style={{ width: '70%', height: 12, borderRadius: 6, background: 'var(--border)', opacity: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <h3>No messages yet</h3>
            <p>Message someone from their profile.</p>
          </div>
        ) : (
          <>
            {friends.length > 0 && (
              <>
                <div style={{ padding: '10px 18px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--bg-elevated, var(--bg-primary))' }}>
                  Messages
                </div>
                {friends.map(conv => (
                  <ConversationListItem
                    key={conv.user?.id}
                    conversation={conv}
                    isSentByMe={conv.lastMessage?.sender_id === user?.id}
                    onClick={() => openConversation(conv.user?.id, conv.user)}
                  />
                ))}
              </>
            )}
            {requests.length > 0 && (
              <>
                <div style={{
                  padding: '10px 18px 6px', fontSize: 11, fontWeight: 700,
                  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em',
                  background: 'var(--bg-elevated, var(--bg-primary))',
                  borderTop: friends.length > 0 ? '6px solid var(--border)' : 'none',
                }}>
                  Message Requests
                </div>
                {requests.map(conv => (
                  <ConversationListItem
                    key={conv.user?.id}
                    conversation={conv}
                    isSentByMe={false}
                    onClick={() => openConversation(conv.user?.id, conv.user)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
