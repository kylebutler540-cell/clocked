import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../lib/utils';

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

function ConversationListItem({ conversation, isSelected, onClick }) {
  const { user, lastMessage, unread } = conversation;
  const name = user?.display_name || 'Unknown';
  const preview = lastMessage?.body ? (lastMessage.body.length > 60 ? lastMessage.body.slice(0, 60) + '…' : lastMessage.body) : '';
  const time = lastMessage ? timeAgo(new Date(lastMessage.created_at)) : '';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        background: isSelected ? 'var(--bg-elevated)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.2s',
      }}
    >
      <Avatar url={user?.avatar_url} name={name} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview || '(No messages yet)'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{time}</div>
        {unread > 0 && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--purple)',
          }} />
        )}
      </div>
    </div>
  );
}

function ConversationView({ userId, onBack }) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const fetchMessages = async (opts = {}) => {
    try {
      const [convRes, userRes] = await Promise.all([
        api.get(`/messages/conversation/${userId}`),
        otherUser === null ? api.get(`/auth/user/${userId}`).catch(() => null) : Promise.resolve(null),
      ]);
      setMessages(convRes.data);
      if (convRes.data.length > 0 && !otherUser) {
        const other = convRes.data[0].sender_id === userId ? convRes.data[0].sender : convRes.data[0].recipient;
        setOtherUser(other);
      } else if (userRes?.data && !otherUser) {
        setOtherUser(userRes.data);
      }
      if (!opts.silent) scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll every 8 seconds
    pollIntervalRef.current = setInterval(() => fetchMessages({ silent: true }), 8000);
    return () => clearInterval(pollIntervalRef.current);
  }, [userId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;

    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      sender_id: currentUser.id,
      recipient_id: userId,
      body: inputValue.trim(),
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputValue('');
    scrollToBottom();
    setSending(true);
    try {
      const res = await api.post(`/messages/${userId}`, { body: optimisticMsg.body });
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.data : m));
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  const otherName = otherUser?.display_name || 'Unknown';

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 20 }}>←</button>
          <div className="spinner" style={{ width: 20, height: 20 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 20, color: 'var(--text-primary)' }}
        >
          ←
        </button>
        {otherUser && <Avatar url={otherUser.avatar_url} name={otherName} size={36} />}
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>{otherName}</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_id === currentUser.id;
            const ts = new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '10px 14px',
                    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isOwn ? '#A855F7' : 'var(--bg-card)',
                    border: isOwn ? 'none' : '1px solid var(--border)',
                    color: isOwn ? 'white' : 'var(--text-primary)',
                    fontSize: 14,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    opacity: msg._optimistic ? 0.7 : 1,
                  }}
                >
                  {msg.body}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{ts}</div>
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
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-primary)',
        }}
      >
        <input
          type="text"
          className="form-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Message..."
          disabled={sending}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={sending || !inputValue.trim()}
          style={{ padding: '8px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(() => searchParams.get('user') || null);

  useEffect(() => {
    if (!user?.email) return;
    setLoading(true);
    api.get('/messages/inbox')
      .then(res => {
        setConversations(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error(err);
        setConversations([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user?.email) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <h3>Sign in to message</h3>
        <p>Create an account to start messaging with users.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/profile')}>
          Go to Profile
        </button>
      </div>
    );
  }

  if (selectedUserId) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ConversationView
          userId={selectedUserId}
          onBack={() => setSelectedUserId(null)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 16px 16px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <h3>No messages yet</h3>
        <p>Message someone from their profile.</p>
      </div>
    );
  }

  const friends = conversations.filter(c => c.isFriend);
  const requests = conversations.filter(c => !c.isFriend);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 16 }}>
        Messages
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {friends.length > 0 && (
          <>
            <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', background: 'var(--bg-elevated)' }}>
              Messages
            </div>
            {friends.map(conv => (
              <ConversationListItem
                key={conv.user.id}
                conversation={conv}
                isSelected={selectedUserId === conv.user.id}
                onClick={() => setSelectedUserId(conv.user.id)}
              />
            ))}
          </>
        )}

        {requests.length > 0 && (
          <>
            <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', background: 'var(--bg-elevated)' }}>
              Message Requests
            </div>
            {requests.map(conv => (
              <ConversationListItem
                key={conv.user.id}
                conversation={conv}
                isSelected={selectedUserId === conv.user.id}
                onClick={() => setSelectedUserId(conv.user.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
