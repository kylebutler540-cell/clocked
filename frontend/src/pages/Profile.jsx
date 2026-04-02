import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import Feed from '../components/Feed';
import PostCard from '../components/PostCard';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

function formatCount(n) {
  if (n == null) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function AvatarCircle({ avatarUrl, name, size = 72 }) {
  const letter = name ? name[0].toUpperCase() : 'A';
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      fontSize: size * 0.38,
      fontWeight: 700,
      color: 'white',
      userSelect: 'none',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : letter
      }
    </div>
  );
}

function FollowListModal({ userId, type, onClose }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followStates, setFollowStates] = useState({});

  useEffect(() => {
    api.get(`/follows/${userId}/${type}`)
      .then(res => {
        setUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [userId, type]);

  async function toggleFollow(targetId, currentlyFollowing) {
    try {
      if (currentlyFollowing) {
        await api.delete(`/follows/${targetId}`);
        setFollowStates(s => ({ ...s, [targetId]: false }));
      } else {
        await api.post(`/follows/${targetId}`);
        setFollowStates(s => ({ ...s, [targetId]: true }));
      }
    } catch {}
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-handle" />
        <h2 className="modal-title" style={{ textTransform: 'capitalize' }}>{type}</h2>
        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
            {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
            {users.map(u => {
              const isFollowing = followStates[u.id] ?? false;
              const name = u.display_name || 'Anonymous';
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => { onClose(); navigate(`/profile/${u.id}`); }}
                  >
                    <AvatarCircle avatarUrl={u.avatar_url} name={name} size={40} />
                  </div>
                  <div
                    style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                    onClick={() => { onClose(); navigate(`/profile/${u.id}`); }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    {u.username && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username}</div>}
                  </div>
                  {currentUser?.email && u.id !== currentUser.id && (
                    <button
                      className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
                      style={{ padding: '5px 14px', fontSize: 12, flexShrink: 0 }}
                      onClick={() => toggleFollow(u.id, isFollowing)}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

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

// Module-level cache for profile tab data — key → { data, ts }
const _profileTabCache = new Map();
const PROFILE_TAB_TTL = 5 * 60 * 1000;

function profileTabFresh(key) {
  const e = _profileTabCache.get(key);
  return e && (Date.now() - e.ts < PROFILE_TAB_TTL);
}

// Post list for posts/liked/disliked tabs
function UserPostList({ url, emptyState }) {
  const navigate = useNavigate();
  const entry = _profileTabCache.get(url);
  const fresh = profileTabFresh(url);
  const [posts, setPosts] = useState(fresh ? entry.data : []);
  const [loading, setLoading] = useState(!fresh);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (profileTabFresh(url)) {
      setPosts(_profileTabCache.get(url).data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(false);
    api.get(url)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        _profileTabCache.set(url, { data, ts: Date.now() });
        setPosts(data);
      })
      .catch(err => {
        if (err.response?.status === 401) setAuthError(true);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return <TabSpinner />;
  if (authError) return (
    <div className="profile-empty-state">
      <p className="profile-empty-text">Sign in to view this content.</p>
      <button
        className="btn btn-primary"
        style={{ marginTop: 16, padding: '9px 24px', fontSize: 14 }}
        onClick={() => navigate('/profile')}
      >
        Sign In
      </button>
    </div>
  );
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
  const fresh = profileTabFresh('comments');
  const [comments, setComments] = useState(fresh ? _profileTabCache.get('comments').data : []);
  const [loading, setLoading] = useState(!fresh);
  const navigate = useNavigate();

  useEffect(() => {
    if (profileTabFresh('comments')) {
      setComments(_profileTabCache.get('comments').data);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get('/posts/user/comments')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        _profileTabCache.set('comments', { data, ts: Date.now() });
        setComments(data);
      })
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
  const { user, loading: authInitializing, isSubscribed, login, register, setUser } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('posts');
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [publicUser, setPublicUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followListModal, setFollowListModal] = useState(null); // 'followers' | 'following' | null

  const isOwnProfile = !viewingUserId || viewingUserId === user?.id;

  // For public profile (/profile/:userId)
  useEffect(() => {
    if (viewingUserId && !isOwnProfile) {
      api.get(`/auth/user/${viewingUserId}`)
        .then(res => setPublicUser(res.data))
        .catch(() => {});

      if (user?.email) {
        api.get(`/follows/${viewingUserId}/is-following`)
          .then(res => setIsFollowing(res.data.following))
          .catch(() => {});
      }
    }
  }, [viewingUserId, isOwnProfile, user?.email]);

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

  async function handleFollow() {
    if (!user?.email) return navigate('/signup');
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const res = await api.delete(`/follows/${viewingUserId}`);
        setIsFollowing(false);
        setPublicUser(u => u ? { ...u, follower_count: res.data.follower_count } : u);
      } else {
        const res = await api.post(`/follows/${viewingUserId}`);
        setIsFollowing(true);
        setPublicUser(u => u ? { ...u, follower_count: res.data.follower_count } : u);
      }
    } catch {
      addToast('Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  }

  const ownDisplayName = user?.display_name || user?.username || 'Anonymous';
  const ownAvatarLetter = ownDisplayName[0]?.toUpperCase() || 'A';

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
    { id: 'liked', label: 'Liked' },
    { id: 'disliked', label: 'Disliked' },
  ];

  // While auth is initializing, show a neutral loading state to prevent signed-out flash
  if (authInitializing) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  // Public profile view (viewing another user's profile)
  if (!isOwnProfile) {
    const pubName = publicUser?.display_name || 'Anonymous';
    return (
      <div className="profile-page">
        <div className="profile-hero">
          <AvatarCircle avatarUrl={publicUser?.avatar_url} name={pubName} size={72} />
          <div className="profile-hero-info">
            <div className="profile-username-large">{pubName}</div>
            {publicUser?.username && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>@{publicUser.username}</div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <button
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setFollowListModal('followers')}
              >
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCount(publicUser?.follower_count)}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>Followers</span>
              </button>
              <button
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setFollowListModal('following')}
              >
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCount(publicUser?.following_count)}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>Following</span>
              </button>
            </div>
            <button
              className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{ marginTop: 12, padding: '7px 20px', fontSize: 13, fontWeight: 600 }}
              onClick={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          </div>
        </div>
        <UserPostList url={`/posts/user/${viewingUserId}/posts`} emptyState={<EmptyState text="This user hasn't posted anything yet." />} />
        {followListModal && (
          <FollowListModal
            userId={viewingUserId}
            type={followListModal}
            onClose={() => setFollowListModal(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="profile-page">

      {/* Hero: avatar + info */}
      {!user?.email ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 24px', textAlign: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 100 100" style={{ marginBottom: 20 }}>
            <rect width="100" height="100" rx="22" fill="rgba(168,85,247,0.12)" />
            <text x="50" y="68" fontFamily="system-ui, sans-serif" fontSize="42" fontWeight="700" fill="#A855F7" textAnchor="middle">c</text>
          </svg>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You're not signed in</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28, maxWidth: 320 }}>
            Sign in to manage your profile, posts, and reviews.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: '11px 32px', fontSize: 15, fontWeight: 700 }}
            onClick={() => navigate('/signup?mode=login')}
          >
            Sign In / Create Account
          </button>
        </div>
      ) : (
        <div className="profile-hero">
          <AvatarCircle avatarUrl={user?.avatar_url} name={ownDisplayName} size={72} />
          <div className="profile-hero-info">
            <div className="profile-username-large">{ownDisplayName}</div>
            {user?.username && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>@{user.username}</div>
            )}
  
            {isSubscribed && <span className="sub-badge" style={{ marginTop: 8 }}>✦ Pro Member</span>}

            {user?.email && (
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <button
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setFollowListModal('followers')}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCount(user?.follower_count)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>Followers</span>
                </button>
                <button
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setFollowListModal('following')}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCount(user?.following_count)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>Following</span>
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {user?.email && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '7px 16px', fontSize: 13 }}
                  onClick={() => navigate('/profile-setup')}
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {user?.email && (
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

      {followListModal && (
        <FollowListModal
          userId={user?.id}
          type={followListModal}
          onClose={() => setFollowListModal(null)}
        />
      )}
    </div>
  );
}
