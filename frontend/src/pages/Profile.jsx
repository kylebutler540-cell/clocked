import React, { useState, useEffect, useRef } from 'react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import AccountSwitcherMenu from '../components/AccountSwitcher';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import { lsGet, lsSet, lsDelete, lsClear } from '../lib/cache';
import Feed from '../components/Feed';
import PostCard from '../components/PostCard';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

// Inline three-dot menu for own profile hero — mobile only
function ProfileDotsMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, color: 'var(--text-primary)', borderRadius: 8 }}
        aria-label="Menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          minWidth: 230,
          zIndex: 500,
          overflow: 'hidden',
        }}>
          <AccountSwitcherMenu onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

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

function FollowListModal({ userId, type, onClose, onFollowChange }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // followStates: null = not loaded yet, true/false = known state
  const [followStates, setFollowStates] = useState({});

  useEffect(() => {
    async function load() {
      const cacheKey = `follows_${userId}_${type}`;
      // Show cached list instantly
      const cached = lsGet(cacheKey);
      if (cached) {
        setUsers(cached.users || []);
        setFollowStates(cached.states || {});
        setLoading(false);
      }
      try {
        const res = await api.get(`/follows/${userId}/${type}`);
        const list = Array.isArray(res.data) ? res.data : [];
        setUsers(list);
        if (currentUser?.email && list.length > 0) {
          const checks = await Promise.all(
            list.map(u =>
              u.id !== currentUser.id
                ? api.get(`/follows/${u.id}/is-following`).then(r => [u.id, r.data.following]).catch(() => [u.id, false])
                : Promise.resolve([u.id, null])
            )
          );
          const states = {};
          checks.forEach(([id, val]) => { if (val !== null) states[id] = val; });
          setFollowStates(states);
          lsSet(cacheKey, { users: list, states });
        } else {
          lsSet(cacheKey, { users: list, states: {} });
        }
      } catch {
        if (!cached) setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, type]); // eslint-disable-line

  async function toggleFollow(targetId, currentlyFollowing) {
    // Optimistic update
    setFollowStates(s => ({ ...s, [targetId]: !currentlyFollowing }));
    try {
      if (currentlyFollowing) {
        await api.delete(`/follows/${targetId}`);
      } else {
        await api.post(`/follows/${targetId}`);
      }
      onFollowChange?.();
    } catch {
      // Revert on error
      setFollowStates(s => ({ ...s, [targetId]: currentlyFollowing }));
    }
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
              // Use loaded state; while loading show nothing (null = not yet fetched)
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
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
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
  const location = useLocation();
  const { userId: viewingUserId } = useParams();
  const { user, loading: authInitializing, isSubscribed, login, register, loginWithGoogle, setUser } = useAuth();
  const { addToast } = useToast();
  // fromDM: the userId of the DM thread we came from (so back goes to that thread)
  const fromDM = location.state?.fromDM || null;
  const [activeTab, setActiveTab] = useState('posts');
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [publicUser, setPublicUser] = useState(null);
  const [publicUserLoading, setPublicUserLoading] = useState(true);
  // Seed follow state from cache immediately to avoid flash
  const [isFollowing, setIsFollowing] = useState(() => {
    if (!viewingUserId) return false;
    const cached = lsGet(`follow_state_${viewingUserId}`);
    return cached?.following ?? false;
  });
  const [followLoading, setFollowLoading] = useState(false);
  const [followListModal, setFollowListModal] = useState(null); // 'followers' | 'following' | null

  const isOwnProfile = !viewingUserId || viewingUserId === user?.id;

  // Refresh own user counts from server (to fix stale following_count)
  useEffect(() => {
    if (isOwnProfile && user?.email) {
      api.get('/auth/me')
        .then(res => { if (res.data?.user) setUser(res.data.user); })
        .catch(() => {});
    }
  }, [isOwnProfile]); // eslint-disable-line

  // For public profile (/profile/:userId)
  useEffect(() => {
    if (viewingUserId && !isOwnProfile) {
      // Show cached profile instantly, fetch fresh in background
      const profileKey = `profile_${viewingUserId}`;
      const cached = lsGet(profileKey);
      if (cached) {
        setPublicUser(cached);
        setPublicUserLoading(false);
      } else {
        setPublicUserLoading(true);
      }
      api.get(`/auth/user/${viewingUserId}`)
        .then(res => {
          setPublicUser(res.data);
          lsSet(profileKey, res.data);
        })
        .catch(() => {})
        .finally(() => setPublicUserLoading(false));

      if (user?.email) {
        api.get(`/follows/${viewingUserId}/is-following`)
          .then(res => {
            setIsFollowing(res.data.following);
            lsSet(`follow_state_${viewingUserId}`, { following: res.data.following });
          })
          .catch(() => {});
      }
    }
  }, [viewingUserId, isOwnProfile, user?.email]);

  

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
    // Optimistic UI update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setPublicUser(u => u ? { ...u, follower_count: (u.follower_count || 0) + (wasFollowing ? -1 : 1) } : u);
    // Optimistically update own following_count in context
    setUser({ ...user, following_count: (user.following_count || 0) + (wasFollowing ? -1 : 1) });
    try {
      if (wasFollowing) {
        const res = await api.delete(`/follows/${viewingUserId}`);
        setPublicUser(u => u ? { ...u, follower_count: res.data.follower_count } : u);
      } else {
        const res = await api.post(`/follows/${viewingUserId}`);
        setPublicUser(u => u ? { ...u, follower_count: res.data.follower_count } : u);
      }
      // Refresh own user from server to get accurate following_count
      api.get('/auth/me').then(r => { if (r.data?.user) setUser(r.data.user); }).catch(() => {});
      // Cache new follow state so next visit loads instantly with correct button
      lsSet(`follow_state_${viewingUserId}`, { following: !wasFollowing });
      // Invalidate cached profile so next visit shows fresh count
      lsDelete(`profile_${viewingUserId}`);
      lsClear(`follows_${viewingUserId}`);
    } catch {
      // Revert optimistic updates
      setIsFollowing(wasFollowing);
      lsSet(`follow_state_${viewingUserId}`, { following: wasFollowing });
      setPublicUser(u => u ? { ...u, follower_count: (u.follower_count || 0) + (wasFollowing ? 1 : -1) } : u);
      setUser({ ...user, following_count: (user.following_count || 0) + (wasFollowing ? 1 : -1) });
      addToast('Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  }

  const ownDisplayName = user?.display_name || user?.username || 'Anonymous';
  const ownAvatarLetter = ownDisplayName[0]?.toUpperCase() || 'A';

  const postsEmptyState = (
    <div className="profile-empty-state">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
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
    // Hold until profile data is loaded — prevents anonymous/0-followers flash
    if (publicUserLoading) {
      return (
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      );
    }

    const pubName = publicUser?.display_name || 'Anonymous';
    return (
      <div className="profile-page">
        {/* Profile hero: avatar left, info right, buttons below */}
        <div style={{ padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top row: avatar + name/handle/counts */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <AvatarCircle avatarUrl={publicUser?.avatar_url} name={pubName} size={72} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 4, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pubName}</div>
              {publicUser?.username && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>@{publicUser.username}</div>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <button
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setFollowListModal('followers')}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCount(publicUser?.follower_count)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>{publicUser?.follower_count === 1 ? 'Follower' : 'Followers'}</span>
                </button>
                <button
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setFollowListModal('following')}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCount(publicUser?.following_count)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>Following</span>
                </button>
              </div>
            </div>
          </div>
          {/* Buttons below — wider, shorter */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{ flex: 1, padding: '8px 0', fontSize: 14, fontWeight: 600, height: 36 }}
              onClick={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px 0', fontSize: 14, fontWeight: 600, height: 36 }}
              onClick={() => user?.email ? navigate('/messages?user=' + viewingUserId) : navigate('/signup')}
            >
              Message
            </button>
          </div>
        </div>
        <UserPostList url={`/posts/user/${viewingUserId}/posts`} emptyState={<EmptyState text="This user hasn't posted anything yet." />} />
        {followListModal && (
          <FollowListModal
            userId={viewingUserId}
            type={followListModal}
            onClose={() => setFollowListModal(null)}
            onFollowChange={() => {
              // Refresh current user's following_count and public user's follower_count
              api.get('/auth/me').then(r => { if (r.data?.user) setUser(r.data.user); }).catch(() => {});
              api.get(`/auth/user/${viewingUserId}`).then(r => setPublicUser(r.data)).catch(() => {});
            }}
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
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 20 }}>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
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
        <div className="profile-hero" style={{ position: 'relative' }}>
          <AvatarCircle avatarUrl={user?.avatar_url} name={ownDisplayName} size={72} />
          <div className="profile-hero-info" style={{ flex: 1, minWidth: 0 }}>
            {/* Name row with inline three-dot menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="profile-username-large" style={{ flex: 1, minWidth: 0 }}>{ownDisplayName}</div>
              <ProfileDotsMenu />
            </div>
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
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>{user?.follower_count === 1 ? 'Follower' : 'Followers'}</span>
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
                  onClick={() => navigate('/profile-setup?mode=edit')}
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

            <GoogleSignInButton
              label="Sign in with Google"
              style={{ marginBottom: 16 }}
              onCredential={async (credential) => {
                try {
                  await loginWithGoogle(credential);
                  setShowLogin(false);
                } catch (err) {
                  addToast(err?.response?.data?.error || 'Google sign-in failed. Please try again.');
                }
              }}
            />
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
          onFollowChange={() => {
            // Refresh own user to get accurate follower/following counts
            api.get('/auth/me').then(r => { if (r.data?.user) setUser(r.data.user); }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
