import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import Feed from '../components/Feed';
import PostCard from '../components/PostCard';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

function EmptyState({ text }) {
  return (
    <div className="profile-empty-state">
      <svg width="48" height="48" viewBox="0 0 100 100" style={{ marginBottom: 16 }}>
        <rect width="100" height="100" rx="20" fill="var(--purple-glow)" />
        <text x="50" y="68" fontFamily="system-ui, sans-serif" fontSize="42" fontWeight="700" fill="var(--purple)" textAnchor="middle">c</text>
      </svg>
      <p className="profile-empty-text">{text}</p>
    </div>
  );
}

function TabSpinner() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
    </div>
  );
}

// Post list for posts/videos/photos/liked/disliked tabs
function UserPostList({ url, emptyState }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(url)
      .then(res => setPosts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return <TabSpinner />;
  if (posts.length === 0) return emptyState || <EmptyState text="Nothing here yet." />;

  return (
    <div className="feed">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
        />
      ))}
    </div>
  );
}

// Comment history tab
function UserCommentList() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.get('/posts/user/comments')
      .then(res => setComments(Array.isArray(res.data) ? res.data : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSpinner />;
  if (comments.length === 0) return <EmptyState text="You haven't commented on any posts yet." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {comments.map(comment => (
        <div
          key={comment.id}
          style={{
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 20px',
            cursor: 'pointer',
          }}
          onClick={() => navigate(`/post/${comment.post_id}`)}
        >
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>
              on <strong style={{ color: 'var(--text-primary)' }}>{comment.post_employer_name || 'a post'}</strong>
              {comment.post_header && (
                <span style={{ color: 'var(--text-muted)' }}> — {comment.post_header}</span>
              )}
            </span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{comment.body}</p>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { userId: viewingUserId } = useParams();
  const { user, isSubscribed, login, register } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('posts');
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [publicUser, setPublicUser] = useState(null);

  const isOwnProfile = !viewingUserId || viewingUserId === user?.id;

  // For public profile (/profile/:userId)
  useEffect(() => {
    if (viewingUserId && !isOwnProfile) {
      api.get(`/auth/user/${viewingUserId}`)
        .then(res => setPublicUser(res.data))
        .catch(() => {});
    }
  }, [viewingUserId, isOwnProfile]);

  // Mount Google button when login modal opens
  useEffect(() => {
    if (!showLogin) return;
    const init = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const res = await api.post('/auth/google', { credential: response.credential });
            localStorage.setItem('clocked-token', res.data.token);
            window.location.href = '/';
          } catch { addToast('Google sign-in failed'); }
        },
      });
      window.google?.accounts.id.renderButton(
        document.getElementById('profile-google-btn'),
        { theme: 'outline', size: 'large', width: '100%', text: 'continue_with', shape: 'pill' }
      );
    };
    if (window.google) { init(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [showLogin]);

  async function handleAuth(e) {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
        addToast('Account created!');
      } else {
        await login(email, password);
        addToast('Logged in!');
      }
      setShowLogin(false);
    } catch (err) {
      addToast(err.response?.data?.error || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  const avatarLetter = user?.email ? user.email[0].toUpperCase() : 'A';
  const displayName = user?.email ? user.email.split('@')[0] : 'Anonymous';

  const postsEmptyState = (
    <div className="profile-empty-state">
      <svg width="56" height="56" viewBox="0 0 100 100" style={{ marginBottom: 16 }}>
        <rect width="100" height="100" rx="20" fill="var(--purple-glow)" />
        <text x="50" y="68" fontFamily="system-ui, sans-serif" fontSize="42" fontWeight="700" fill="var(--purple)" textAnchor="middle">c</text>
      </svg>
      <p className="profile-empty-title">You haven't made any posts yet.</p>
      <p className="profile-empty-text">Create your first post and share your experience anonymously.</p>
      <button
        className="btn btn-primary"
        style={{ marginTop: 20, padding: '11px 24px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        onClick={() => navigate('/create')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Create Post
      </button>
    </div>
  );

  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'comments', label: 'Comments' },
    { id: 'videos', label: 'Videos' },
    { id: 'photos', label: 'Photos' },
    { id: 'liked', label: 'Liked' },
    { id: 'disliked', label: 'Disliked' },
  ];

  // Public profile view (viewing another user's profile)
  if (!isOwnProfile) {
    const displayName = publicUser?.anon_number ? `Anonymous ${publicUser.anon_number}` : 'Anonymous User';
    const avatarChar = publicUser?.anon_number ? String(publicUser.anon_number)[0] : 'A';
    return (
      <div className="profile-page">
        <div className="profile-hero">
          <div className="profile-avatar-large">{avatarChar}</div>
          <div className="profile-hero-info">
            <div className="profile-username-large">{displayName}</div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: 10, padding: '7px 20px', fontSize: 13, fontWeight: 600 }}
              onClick={() => addToast('Follow feature coming soon')}
            >
              Follow
            </button>
          </div>
        </div>
        <UserPostList url={`/posts/user/${viewingUserId}/posts`} />
      </div>
    );
  }

  return (
    <div className="profile-page">

      {/* Hero: avatar + info */}
      <div className="profile-hero">
        <div className="profile-avatar-large">{avatarLetter}</div>
        <div className="profile-hero-info">
          <div className="profile-username-large">{displayName}</div>
          {user?.email && (
            <div className="profile-hero-email">{user.email}</div>
          )}
          {user?.anon_number && (
            <div className="profile-hero-anon">Anonymous {user.anon_number}</div>
          )}
          {isSubscribed && <span className="sub-badge" style={{ marginTop: 8 }}>✦ Pro Member</span>}
          {!user?.email && user && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 12, padding: '8px 20px', fontSize: 13 }}
              onClick={() => setShowLogin(true)}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {!user && (
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 16 }}>Sign in to view your profile</p>
          <button className="btn btn-primary" style={{ padding: '9px 24px', fontSize: 14 }} onClick={() => setShowLogin(true)}>
            Sign In
          </button>
        </div>
      )}

      {user && (
        <>
          {/* Tab bar */}
          <div className="profile-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`profile-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'posts' && (
            <UserPostList url="/posts/user/posts" emptyState={postsEmptyState} />
          )}

          {activeTab === 'comments' && (
            <UserCommentList />
          )}

          {activeTab === 'videos' && (
            <UserPostList url="/posts/user/videos" user={user} />
          )}

          {activeTab === 'photos' && (
            <UserPostList url="/posts/user/photos" user={user} />
          )}

          {activeTab === 'liked' && (
            <UserPostList url="/posts/user/liked" user={user} />
          )}

          {activeTab === 'disliked' && (
            <UserPostList url="/posts/user/disliked" user={user} />
          )}
        </>
      )}

      {/* Auth modal */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">{isRegister ? 'Create Account' : 'Sign In'}</h2>
            <p className="modal-subtitle">
              {isRegister
                ? 'Save reviews, get notifications, and manage your subscription.'
                : 'Welcome back.'}
            </p>

            <div id="profile-google-btn" style={{ marginBottom: 16, width: '100%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={authLoading}
              >
                {authLoading ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <button
              className="btn btn-ghost btn-full"
              style={{ marginTop: 8 }}
              onClick={() => setIsRegister(r => !r)}
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
