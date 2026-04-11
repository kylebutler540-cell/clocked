import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';

// ─── Timestamp helpers ────────────────────────────────────────────────────────

function formatMsgTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  // Use calendar day diff, not 24h diff, so it never shows 0d
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayMidnight - msgMidnight) / 86400000);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}m`;
  return `${Math.floor(diffMonths / 12)}y`;
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = Math.floor(diff / 86400);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}m`;
  return `${Math.floor(mo / 12)}y`;
}

// Format date for day separators: Today / Yesterday / April 10 / April 10, 2024
function formatDaySeparator(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayMidnight - msgMidnight) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  const opts = date.getFullYear() === now.getFullYear()
    ? { month: 'long', day: 'numeric' }
    : { month: 'long', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', opts);
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
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
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : letter}
    </div>
  );
}

function AvatarSkeleton({ size = 40 }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'var(--border)' }} />;
}

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

// ─── Conversation List Item (no dividers) ────────────────────────────────────

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
        padding: '12px 20px', cursor: 'pointer',
        background: 'transparent',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={e => e.currentTarget.style.background = 'rgba(168,85,247,0.06)'}
      onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar url={user?.avatar_url} name={name} size={50} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
          {name}
        </div>
        <div style={{
          fontSize: 13, color: unread > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
          fontWeight: unread > 0 ? 500 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {preview}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{time}</div>
        {unread > 0 && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#A855F7' }} />}
      </div>
    </div>
  );
}

// ─── Input Bar ───────────────────────────────────────────────────────────────

function InputBar({ inputRef, inputValue, setInputValue, onSend, onFocused, onBlurred, pendingImage, onPickImage, onClearImage }) {
  const cameraRef = useRef(null);   // capture=camera
  const libraryRef = useRef(null);  // no capture (library + files)
  const dragHandleRef = useRef(null);
  const touchStartY = useRef(null);
  const isDragging = useRef(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleTouchStart = e => { touchStartY.current = e.touches[0].clientY; isDragging.current = false; };
  const handleTouchMove = e => { if (touchStartY.current === null) return; if (e.touches[0].clientY - touchStartY.current > 8) isDragging.current = true; };
  const handleTouchEnd = e => {
    if (touchStartY.current === null) return;
    if (isDragging.current && e.changedTouches[0].clientY - touchStartY.current >= 30) inputRef.current?.blur();
    touchStartY.current = null; isDragging.current = false;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPickImage?.(file);
    e.target.value = '';
    setShowPicker(false);
  };

  const canSend = inputValue.trim() || pendingImage;

  return (
    <div style={{ flexShrink: 0, background: 'var(--bg-primary)', paddingBottom: 'max(env(safe-area-inset-bottom), 10px)', transition: 'padding-bottom 0.1s' }}>
      {/* Drag handle */}
      <div ref={dragHandleRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '6px 0 2px', cursor: 'grab', touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', opacity: 0.5 }} />
      </div>

      {/* Image preview strip — shows above input when image selected */}
      {pendingImage && (
        <div style={{ padding: '4px 14px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <img src={pendingImage.preview} alt="preview" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '2px solid #A855F7' }} />
            <button
              onClick={onClearImage}
              style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--text-primary)', border: '2px solid var(--bg-primary)', color: 'var(--bg-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}
            >×</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 4px' }}>
        {/* Photo button */}
        <button
          onClick={() => setShowPicker(true)}
          style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent', flexShrink: 0 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        {/* Hidden file inputs */}
        <input ref={cameraRef} type="file" accept="image/*" capture="camera" onChange={handleFileChange} style={{ display: 'none' }} />
        <input ref={libraryRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            // Mobile: Enter sends. Desktop: Enter = new line, Shift+Enter sends
            const isMobile = window.matchMedia('(max-width: 767px)').matches;
            if (e.key === 'Enter') {
              if (isMobile && !e.shiftKey) { onSend(e); }
              else if (!isMobile && e.shiftKey) { onSend(e); }
            }
          }}
          onFocus={onFocused}
          onBlur={onBlurred}
          placeholder="Message…"
          autoComplete="off"
          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 24, padding: '10px 16px', fontSize: 15, background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', WebkitAppearance: 'none' }}
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          style={{ width: 42, height: 42, borderRadius: '50%', background: canSend ? '#A855F7' : 'var(--border)', border: 'none', cursor: canSend ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" /></svg>
        </button>
      </div>

      {/* Floating dark popup menu — matches reference design */}
      {showPicker && (
        <div
          onClick={() => setShowPicker(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 90,
              left: 16,
              background: '#1e1e1e',
              borderRadius: 16,
              overflow: 'hidden',
              minWidth: 220,
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            {[
              {
                label: 'Photo Library',
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                ),
                action: () => { setShowPicker(false); setTimeout(() => libraryRef.current?.click(), 50); },
              },
              {
                label: 'Take Photo or Video',
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                ),
                action: () => { setShowPicker(false); setTimeout(() => cameraRef.current?.click(), 50); },
              },
              {
                label: 'Choose Files',
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                ),
                action: () => { setShowPicker(false); setTimeout(() => libraryRef.current?.click(), 50); },
              },
            ].map((item, i, arr) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  padding: '14px 18px',
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ opacity: 0.85 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fullscreen Image Viewer ─────────────────────────────────────────────────

function ImageViewer({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 'max(env(safe-area-inset-top),16px)', right: 16,
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, color: '#fff', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}
      >×</button>
      <img
        src={src}
        alt="fullscreen"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }}
      />
    </div>
  );
}

// ─── Conversation View ────────────────────────────────────────────────────────

function ConversationView({ userId, initialUser, onBack, onMessageSent }) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [convStatus, setConvStatus] = useState(initialUser?._convStatus || null);
  const [otherUser, setOtherUser] = useState(initialUser || null);
  const scrollContainerRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);
  const lastCountRef = useRef(0);
  const isInputFocusedRef = useRef(false);
  const outerRef = useRef(null);
  const hasLoadedRef = useRef(false);

  const scrollToBottom = useCallback((behavior = 'auto') => {
    requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Prefetch otherUser immediately if not seeded — so header is instant
  useEffect(() => {
    if (!otherUser) {
      api.get(`/auth/user/${userId}`)
        .then(res => setOtherUser(prev => prev || res.data))
        .catch(() => {});
    }
  }, [userId]); // eslint-disable-line

  const fetchMessages = useCallback(async (opts = {}) => {
    try {
      const res = await api.get(`/messages/conversation/${userId}`);
      // Backend now returns { messages, conversation_status }
      const data = Array.isArray(res.data) ? res.data : (res.data?.messages || []);
      const status = res.data?.conversation_status || null;

      setConvStatus(status);

      setMessages(prev => {
        if (!opts.silent) return data;
        const serverIds = new Set(data.map(m => m.id));
        const inFlight = prev.filter(m => m._status === 'sending' && !serverIds.has(m.id));
        return [...data, ...inFlight];
      });

      if (data.length > 0 && !otherUser) {
        setOtherUser(prev => prev || (data[0].sender_id === userId ? data[0].sender : data[0].recipient));
      }

      const isNew = data.length > lastCountRef.current;
      // Always scroll to bottom on first load; on silent polls only if new messages
      if (!opts.silent) {
        // Use setTimeout to ensure DOM has rendered before scrolling
        setTimeout(() => scrollToBottom(), 0);
      } else if (isNew && !isInputFocusedRef.current) {
        scrollToBottom();
      }
      lastCountRef.current = data.length;
    } catch (err) {
      console.error('fetchMessages', err);
      if (!hasLoadedRef.current) setFetchError(true);
    } finally {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        setLoading(false);
      }
    }
  }, [userId, otherUser, scrollToBottom]);

  useEffect(() => {
    // Always start at bottom when entering a thread
    setTimeout(() => scrollToBottom(), 0);
    fetchMessages();
    pollRef.current = setInterval(() => fetchMessages({ silent: true }), 10000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]); // eslint-disable-line

  // Back-swipe / browser back → always calls onBack which routes correctly by entry source
  useEffect(() => {
    // Push a dummy history entry only for inbox-opened convos
    // Profile-opened convos already have the profile in history — don't double-push
    const fromProfile = initialUser?._convStatus !== undefined
      ? false // opened from inbox with convStatus
      : window.location.search.includes('user='); // opened via ?user= from profile

    if (!fromProfile) {
      window.history.pushState({ msgConvo: true }, '');
    }

    const handlePop = () => { onBack(); };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      if (!fromProfile && window.history.state?.msgConvo) {
        window.history.back();
      }
    };
  }, []); // eslint-disable-line

  // Keyboard lift via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let lastH = vv.height;
    const update = () => {
      const outer = outerRef.current;
      if (!outer) return;
      outer.style.height = `${vv.height}px`;
      outer.style.top = `${vv.offsetTop}px`;
      if (vv.height < lastH - 50) scrollToBottom();
      lastH = vv.height;
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []); // eslint-disable-line

  const handlePickImage = (file) => {
    const preview = URL.createObjectURL(file);
    setPendingImage({ file, preview });
    // Focus input so user can optionally type a caption
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClearImage = () => {
    if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const body = inputValue.trim();
    if (!body && !pendingImage) return;
    if (!currentUser?.id) return;

    const tmpId = `opt-${Date.now()}`;
    const now = new Date().toISOString();
    const localImageUrl = pendingImage?.preview || null;

    // Optimistic message
    setMessages(prev => [...prev, {
      id: tmpId,
      sender_id: currentUser.id,
      recipient_id: userId,
      body: body || '',
      image_url: localImageUrl,
      created_at: now,
      _status: 'sending',
    }]);
    setInputValue('');
    const capturedPending = pendingImage;
    setPendingImage(null);
    scrollToBottom();
    onMessageSent?.(userId, body || '📷 Photo', now, otherUser);

    try {
      let imageBase64 = null;
      if (capturedPending) {
        // Convert file to base64 data URL
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(capturedPending.file);
        });
        URL.revokeObjectURL(capturedPending.preview);
      }

      const res = await api.post(`/messages/${userId}`, {
        body: body || '',
        ...(imageBase64 ? { image_url: imageBase64 } : {}),
      });
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
      const res = await api.post(`/messages/${userId}`, {
        body: msg.body || '',
        ...(msg.image_url ? { image_url: msg.image_url } : {}),
      });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...res.data, _status: 'sent' } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _status: 'failed' } : m));
    }
  };

  const handleAccept = async () => {
    try {
      await api.post(`/messages/${userId}/accept`);
      setConvStatus('accepted');
      onMessageSent?.(userId, null, new Date().toISOString(), otherUser);
    } catch (err) { console.error('accept', err); }
  };

  const handleReject = async () => {
    try {
      await api.post(`/messages/${userId}/reject`);
      onBack();
    } catch (err) { console.error('reject', err); }
  };

  const otherName = otherUser?.display_name || null;
  // Receiver sees pending when they have not yet accepted
  const isIncomingRequest = convStatus === 'pending' && messages.length > 0 && messages[0]?.sender_id === userId;
  // Sender sees pending when waiting for receiver
  const isPendingRequest = convStatus === 'pending' && messages.length > 0 && messages[0]?.sender_id === currentUser?.id;

  // Build message list with day separators
  const messagesWithSeparators = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    if (!prev || !isSameDay(prev.created_at, msg.created_at)) {
      messagesWithSeparators.push({ type: 'separator', date: msg.created_at, key: `sep-${msg.id}` });
    }
    messagesWithSeparators.push({ type: 'message', msg, key: msg.id });
  });

  return (
    <div ref={outerRef} style={{ display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh', background: 'var(--bg-primary)', zIndex: 200, overflow: 'hidden', willChange: 'height, top' }}>

      {/* Header — no bottom border */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', paddingTop: 'max(env(safe-area-inset-top), 12px)', background: 'var(--bg-primary)', flexShrink: 0, zIndex: 1 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', padding: '4px 8px 4px 0', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {otherName === null ? <AvatarSkeleton size={36} /> : <Avatar url={otherUser?.avatar_url} name={otherName} size={36} />}
        <div style={{ fontWeight: 700, fontSize: 16, color: otherName ? 'var(--text-primary)' : 'var(--border)', flex: 1 }}>
          {otherName || <div style={{ width: 100, height: 16, borderRadius: 8, background: 'var(--border)' }} />}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2, WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0' }}>
            {[55, 38, 75, 45, 65].map((w, i) => (
              <div key={i} style={{ alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start', width: `${w}%`, height: 42, borderRadius: 20, background: 'var(--border)', opacity: 0.45 }} />
            ))}
          </div>
        ) : fetchError ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px' }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Couldn't load messages</div>
            <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={() => { setFetchError(false); setLoading(true); hasLoadedRef.current = false; fetchMessages(); }}>Retry</button>
          </div>
        ) : (
          <>
            {/* Profile header — always shown at top of thread, new or existing */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, paddingBottom: 20, gap: 0 }}>
              {otherUser
                ? <Avatar url={otherUser.avatar_url} name={otherName} size={72} />
                : <AvatarSkeleton size={72} />}
              {otherName && <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginTop: 12 }}>{otherName}</div>}
              {otherUser?.username && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>@{otherUser.username}</div>}
              {(otherUser?.follower_count != null || otherUser?.following_count != null) && (
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  <span><strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatCount(otherUser.follower_count)}</strong> Followers</span>
                  <span><strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatCount(otherUser.following_count)}</strong> Following</span>
                </div>
              )}
            </div>
            {messagesWithSeparators.length === 0 ? null : <>
            {messagesWithSeparators.map(item => {
              if (item.type === 'separator') {
                return (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px 0 8px', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{formatDaySeparator(item.date)}</span>
                  </div>
                );
              }
              const { msg } = item;
              const isOwn = msg.sender_id === currentUser?.id;
              const isFailed = msg._status === 'failed';
              const isSending = msg._status === 'sending';

              return (
                <div key={item.key} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: 1 }}>
                  {/* Image message */}
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt="sent image"
                      onClick={isFailed ? () => handleRetry(msg) : () => setViewingImage(msg.image_url)}
                      style={{
                        maxWidth: '65%', maxHeight: 280,
                        borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        objectFit: 'cover', opacity: isSending ? 0.6 : 1,
                        cursor: 'pointer', display: 'block',
                      }}
                    />
                  )}
                  {/* Text message */}
                  {msg.body ? (
                    <div
                      onClick={isFailed ? () => handleRetry(msg) : undefined}
                      style={{
                        maxWidth: '75%', padding: '10px 14px',
                        borderRadius: isOwn ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                        background: isFailed ? '#ef4444' : isOwn ? '#A855F7' : 'var(--bg-card)',
                        border: isOwn ? 'none' : '1px solid var(--border)',
                        color: isOwn ? '#fff' : 'var(--text-primary)',
                        fontSize: 15, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                        opacity: isSending ? 0.55 : 1, transition: 'opacity 0.2s',
                        cursor: isFailed ? 'pointer' : 'default',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {msg.body}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
                    {isSending && 'Sending…'}
                    {isFailed && <span style={{ color: '#ef4444' }}>Not sent · Tap to retry</span>}
                    {!isSending && !isFailed && formatMsgTime(msg.created_at)}
                  </div>
                </div>
              );
            })}
            {isPendingRequest && (
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '12px 20px', background: 'rgba(168,85,247,0.06)', borderRadius: 12, margin: '8px 0' }}>
                Message request sent · Waiting for them to accept
              </div>
            )}
            </> /* end inner fragment for messages */}
          </>
        )}
        <div style={{ height: 1 }} />
      </div>

      {/* Fullscreen image viewer */}
      {viewingImage && <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}

      {/* Incoming request — Accept / Reject bar */}
      {isIncomingRequest && (
        <div style={{ flexShrink: 0, padding: '12px 16px', background: 'var(--bg-card)', borderTop: 'none' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
            {otherName || 'Someone'} wants to message you
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleReject}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >Decline</button>
            <button
              onClick={handleAccept}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: '#A855F7', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >Accept</button>
          </div>
        </div>
      )}

      {/* Sender pending state */}
      {isPendingRequest && (
        <div style={{ flexShrink: 0, padding: '10px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-primary)', borderTop: 'none' }}>
          Message request sent · Waiting for them to accept
        </div>
      )}

      {/* Input — only show if accepted or sender of pending */}
      {(convStatus === 'accepted' || isPendingRequest || convStatus === null) && (
        <InputBar
          inputRef={inputRef}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSend={handleSend}
          pendingImage={pendingImage}
          onPickImage={handlePickImage}
          onClearImage={handleClearImage}
          onFocused={() => {
            isInputFocusedRef.current = true;
            setTimeout(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight; }, 100);
          }}
          onBlurred={() => { isInputFocusedRef.current = false; }}
        />
      )}
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [entrySource, setEntrySource] = useState(null); // 'inbox' | 'profile' | null
  const inboxPollRef = useRef(null);

  useEffect(() => {
    const uid = searchParams.get('user');
    if (uid) openConversation(uid, null, null, 'profile');
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

  // Wipe inbox instantly on account switch
  useEffect(() => {
    const handler = () => {
      setConversations([]);
      setLoading(true);
      closeConversation();
    };
    window.addEventListener('account:switching', handler);
    return () => window.removeEventListener('account:switching', handler);
  }, []); // eslint-disable-line

  useEffect(() => {
    setFullscreen(!!selectedUserId);
    return () => setFullscreen(false);
  }, [selectedUserId, setFullscreen]);

  useEffect(() => { return () => setFullscreen(false); }, [setFullscreen]);

  useEffect(() => {
    const handler = () => {
      setSelectedUserId(null);
      setSelectedUser(null);
      setEntrySource(null);
      fetchInbox();
    };
    window.addEventListener('messages:close-convo', handler);
    return () => window.removeEventListener('messages:close-convo', handler);
  }, [fetchInbox]);

  const openConversation = (uid, convUser, convStatus, source = 'inbox') => {
    setSelectedUserId(uid);
    setSelectedUser(convUser ? { ...convUser, _convStatus: convStatus } : null);
    setEntrySource(source);
  };
  const closeConversation = () => {
    const source = entrySource;
    setSelectedUserId(null);
    setSelectedUser(null);
    setEntrySource(null);
    if (source === 'profile') {
      // Go back to the profile page they came from
      navigate(-1);
    } else {
      // Came from inbox — stay on Messages page, just close the convo
      fetchInbox();
    }
  };

  const processedConversations = conversations.map(conv => ({
    ...conv,
    // Show as request if backend says pending AND the other person sent it (receiver side)
    _showAsRequest: conv.conversation_status === 'pending' && conv.lastMessage?.sender_id !== user?.id,
  }));

  const handleMessageSent = useCallback((toUserId, body, sentAt, toUser) => {
    setConversations(prev => {
      const existing = prev.find(c => c.user?.id === toUserId);
      const updatedConv = existing
        ? { ...existing, lastMessage: { body, created_at: sentAt, sender_id: user?.id }, unread: 0 }
        : { user: toUser || { id: toUserId }, lastMessage: { body, created_at: sentAt, sender_id: user?.id }, unread: 0, isFriend: false };
      const others = prev.filter(c => c.user?.id !== toUserId);
      if (updatedConv.isFriend) return [updatedConv, ...others];
      return [...others.filter(c => c.isFriend), updatedConv, ...others.filter(c => !c.isFriend && c.user?.id !== toUserId)];
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
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/profile')}>Sign In</button>
      </div>
    );
  }

  const friends = processedConversations.filter(c => !c._showAsRequest);
  const requests = processedConversations.filter(c => c._showAsRequest);

  return (
    <>
      {selectedUserId && (
        <ConversationView
          userId={selectedUserId}
          initialUser={selectedUser ? { ...selectedUser, isFriend: conversations.find(c => c.user?.id === selectedUserId)?.isFriend } : null}
          onBack={closeConversation}
          onMessageSent={handleMessageSent}
        />
      )}

      {/* Inbox — no gray header background, larger title, no dividers */}
      <div style={{ display: selectedUserId ? 'none' : 'flex', flexDirection: 'column', minHeight: '60vh', maxWidth: 680, width: '100%', margin: '0 auto' }}>
        {/* Title — matches Home/Alerts style */}
        <div style={{ padding: '20px 20px 12px', background: 'transparent' }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Messages</h1>
        </div>

        {loading ? (
          <div style={{ padding: '4px 0' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px' }}>
                <AvatarSkeleton size={50} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '40%', height: 14, borderRadius: 7, background: 'var(--border)', marginBottom: 8 }} />
                  <div style={{ width: '65%', height: 12, borderRadius: 6, background: 'var(--border)', opacity: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
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
                {friends.length > 0 && requests.length > 0 && (
                  <div style={{ padding: '4px 20px 2px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Messages
                  </div>
                )}
                {friends.map(conv => (
                  <ConversationListItem key={conv.user?.id} conversation={conv} isSentByMe={conv.lastMessage?.sender_id === user?.id} onClick={() => openConversation(conv.user?.id, conv.user, conv.conversation_status)} />
                ))}
              </>
            )}
            {requests.length > 0 && (
              <>
                <div style={{ padding: '16px 20px 4px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Message Requests
                </div>
                {requests.map(conv => (
                  <ConversationListItem key={conv.user?.id} conversation={conv} isSentByMe={false} onClick={() => openConversation(conv.user?.id, conv.user, conv.conversation_status)} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
