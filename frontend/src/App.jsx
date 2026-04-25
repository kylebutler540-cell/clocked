import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotifProvider } from './context/NotifContext';
import { MessagingProvider, useMessaging } from './context/MessagingContext';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { useNotif } from './context/NotifContext';

import BottomNav from './components/BottomNav';
import ClockedLogo from './components/ClockedLogo';
import LeftSidebar from './components/LeftSidebar';
import AccountSwitcherMenu from './components/AccountSwitcher';
import EmployerSearch from './components/EmployerSearch';
import LocationModal from './components/LocationModal';

// Lazy-load all pages — only the home feed loads on first visit
// Everything else (Notifications, Messages, Profile, etc.) loads on demand
const Home = React.lazy(() => import('./pages/Home'));
const Create = React.lazy(() => import('./pages/Create'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const CommunityGuidelines = React.lazy(() => import('./pages/CommunityGuidelines'));
const Contact = React.lazy(() => import('./pages/Contact'));
const FindFriends = React.lazy(() => import('./pages/FindFriends'));
const Profile = React.lazy(() => import('./pages/Profile'));
const PostDetail = React.lazy(() => import('./pages/PostDetail'));
const CompanyProfile = React.lazy(() => import('./pages/CompanyProfile'));
const Saved = React.lazy(() => import('./pages/Saved'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const Signup = React.lazy(() => import('./pages/Signup'));
const SwitchAccount = React.lazy(() => import('./pages/SwitchAccount'));
const ProfileSetup = React.lazy(() => import('./pages/ProfileSetup'));
// Messages exports two things — need special handling
import Messages, { AppLevelConversationView } from './pages/Messages';

const PAGE_TITLES = {
  '/notifications': 'Alerts',
  '/messages': 'Messages',
};

// Desktop top bar — full width, Reddit-style
function LocationPill() {
  const [location, setLocation] = useState(() => localStorage.getItem('userLocation') || '');
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
          color: location ? 'var(--text-primary)' : 'var(--text-muted)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          whiteSpace: 'nowrap', flexShrink: 0, transition: 'border-color 0.15s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        {location || 'Set location'}
      </button>
      {showModal && createPortal(
        <LocationModal onClose={(city) => { if (city) setLocation(city); setShowModal(false); }} />,
        document.body
      )}
    </>
  );
}

function GetAppModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 340, textAlign: 'center' }}>
        <div className="modal-handle" />
        <h2 className="modal-title">Get the Clocked App</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Coming soon to iOS and Android</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-secondary btn-full" disabled style={{ opacity: 0.5 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:8}}><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Download on App Store
          </button>
          <button className="btn btn-secondary btn-full" disabled style={{ opacity: 0.5 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:8}}><path d="M3.18 23.76c.3.17.64.24.99.2l12.6-12.6-3.12-3.12L3.18 23.76zm16.44-10.94L17.34 11.4l1.72-1.72 2.28 1.3c.65.37.65 1.34 0 1.84zM2.94.28c-.06.13-.1.29-.1.47v22.5c0 .18.04.34.1.47l.05.04 12.6-12.6v-.3L2.99.24l-.05.04zM15.99 15.32l-3.12 3.12 1.44 1.44c.65.65 1.7.65 2.35 0L17.97 18c.65-.65.65-1.7 0-2.35l-1.98-1.98z"/></svg>
            Get it on Google Play
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
          We're working on it — join the waitlist at theclocked.com
        </p>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = React.useRef(pathname);
  React.useEffect(() => {
    // Only scroll to top when pathname actually changes (not on re-renders)
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
}

function DesktopTopBar({ sidebarCollapsed, onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGetApp, setShowGetApp] = useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    function handleOutsideClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  return (
    <div className="desktop-topbar">
      {/* Left: collapse button + logo + location */}
      <div className="desktop-topbar-left">
        <button className="collapse-btn" onClick={onToggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <ClockedLogo height={28} style={{ cursor: 'pointer' }} onClick={() => navigate('/')} />
        <LocationPill />
      </div>

      {/* Center: search bar */}
      <div className="desktop-topbar-search">
        <EmployerSearch onSelect={place => navigate(`/company/${place.place_id}`, { state: { name: place.name, address: place.address } })} placeholder="Search employers..." />
      </div>
      {showGetApp && createPortal(<GetAppModal onClose={() => setShowGetApp(false)} />, document.body)}

      {/* Right: get app + login + menu */}
      <div className="desktop-topbar-right">
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
          onClick={() => setShowGetApp(true)}
        >
          Get App
        </button>
        {authLoading ? (
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--border)' }} />
        ) : user?.email ? (
          <div
            onClick={() => navigate('/profile')}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: user.avatar_url ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', flexShrink: 0, overflow: 'hidden',
              userSelect: 'none',
            }}
            title={user.email}
          >
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (user.display_name ? user.display_name[0].toUpperCase() : user.email[0].toUpperCase())
            }
          </div>
        ) : (
          <button className="btn btn-primary" style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => navigate('/signup')}>
            Log In
          </button>
        )}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="topbar-menu-btn" onClick={() => setMenuOpen(v => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="topbar-dropdown">
              <AccountSwitcherMenu onClose={() => setMenuOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile top bar — Home page only. +, logo, bell.
function MobileHeader() {
  const navigate = useNavigate();
  const { unreadCount } = useNotif();

  return (
    <header className="app-header mobile-top-bar">
      <button
        className="mobile-top-bar-btn"
        onClick={() => navigate('/create')}
        aria-label="Create post"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <ClockedLogo height={30} onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
      <button
        className="mobile-top-bar-btn"
        onClick={() => navigate('/notifications')}
        aria-label="Notifications"
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -6,
              background: '#ef4444', color: '#fff',
              fontSize: 10, fontWeight: 700, lineHeight: 1,
              minWidth: 16, height: 16, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
      </button>
    </header>
  );
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="back-btn"
      aria-label="Go back"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
  );
}

// Main tabs — back button suppressed here
const MAIN_TABS = new Set(['/messages', '/profile']);

// Tabs with no top bar content on mobile — hide the header entirely to reclaim space
const NO_HEADER_TABS = new Set(['/profile']);

function PageHeader() {
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/search';
  const title = PAGE_TITLES[location.pathname];
  const isMainTab = MAIN_TABS.has(location.pathname);

  if (isHome) return <MobileHeader />;
  if (NO_HEADER_TABS.has(location.pathname)) return null;

  return (
    <header className="app-header" style={{ justifyContent: 'flex-start', gap: 12 }}>
      {!isMainTab && <BackButton />}
      {title && <h2 style={{ margin: 0, fontSize: location.pathname === '/messages' ? 22 : 18, fontWeight: location.pathname === '/messages' ? 700 : 600, flex: 1, paddingLeft: isMainTab ? 8 : 0 }}>{title}</h2>}
    </header>
  );
}

function DesktopTopBarWrapper(props) {
  return <DesktopTopBar {...props} />;
}

function DesktopBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/search';
  if (isHome) return null;
  return (
    <div className="desktop-back-wrapper">
      <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Back</span>
      </button>
    </div>
  );
}

function AppMainWrapper({ children }) {
  const location = useLocation();
  const fullWidthRoutes = ['/signup', '/profile-setup', '/subscription/success', '/subscription/cancel'];
  const isFullWidth = fullWidthRoutes.includes(location.pathname);
  return (
    <div className={`app-main${isFullWidth ? ' full-width' : ''}`} style={{ height: 'auto', minHeight: 0 }}>
      {children}
    </div>
  );
}

// Tab order matches BottomNav exactly
const TAB_PATHS = ['/', '/messages', '/profile'];

// Swipe handler: horizontal swipe on a main tab → move one adjacent tab
function SwipeHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    let startX = null;
    let startY = null;
    let captured = false;

    const MIN_SWIPE = 52;
    const MAX_VERT = 75;

    const currentTabIdx = TAB_PATHS.findIndex(p =>
      p === '/' ? location.pathname === '/' || location.pathname === '/search' : location.pathname === p
    );
    const isMainTab = currentTabIdx >= 0;

    function onTouchStart(e) {
      if (e.touches.length > 1) { startX = null; return; }
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) { startX = null; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      captured = false;
    }

    function onTouchMove(e) {
      if (startX === null || !isMainTab) return;
      const dx = e.touches[0].clientX - startX;
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dy > MAX_VERT && dy > Math.abs(dx)) { captured = false; return; }
      if (!captured && Math.abs(dx) > 12 && dy < MAX_VERT) {
        captured = true;
        e.preventDefault();
      } else if (captured) {
        e.preventDefault();
      }
    }

    function onTouchEnd(e) {
      if (startX === null || !captured) { startX = null; captured = false; return; }
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (isMainTab && dy < MAX_VERT && Math.abs(dx) >= MIN_SWIPE) {
        const nextIdx = dx < 0 ? currentTabIdx + 1 : currentTabIdx - 1;
        if (nextIdx >= 0 && nextIdx < TAB_PATHS.length) navigate(TAB_PATHS[nextIdx]);
      }
      startX = null; startY = null; captured = false;
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [location.pathname, navigate]);

  return null;
}

// Rendered inside BrowserRouter — safe to call useLocation here
function MobileHeaderWrapper() {
  const location = useLocation();
  const noHeader = NO_HEADER_TABS.has(location.pathname);

  React.useEffect(() => {
    const el = document.querySelector('.page-content');
    if (!el) return;
    if (noHeader) el.setAttribute('data-no-header', 'true');
    else el.removeAttribute('data-no-header');
  }, [noHeader]);

  if (noHeader) return null;
  return (
    <div className="mobile-only-header">
      <PageHeader />
    </div>
  );
}

function AppInner() {
  const { fullscreen } = useMessaging();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('hasSeenOnboarding')
  );

  if (showOnboarding) {
    return (
      <BrowserRouter>
        <React.Suspense fallback={null}>
          <Onboarding onDone={() => setShowOnboarding(false)} />
        </React.Suspense>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <SwipeHandler />
      <AppLevelConversationView />
      {!fullscreen && <DesktopTopBarWrapper sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(v => !v)} />}
      <div className={`app-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}${fullscreen ? ' messaging-fullscreen' : ''}`}>
        {!fullscreen && <LeftSidebar collapsed={sidebarCollapsed} />}
        <AppMainWrapper>
          {!fullscreen && <MobileHeaderWrapper />}
          {!fullscreen && <DesktopBackButton />}
          <main className="page-content" style={fullscreen ? { padding: 0, margin: 0, height: '100dvh', overflow: 'hidden' } : {}}>
            <React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Home />} />
              <Route path="/create" element={<Create />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:userId" element={<Messages />} />
              <Route path="/find-friends" element={<FindFriends />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/company/:placeId" element={<CompanyProfile />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/switch-account" element={<SwitchAccount />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/subscription/success" element={<SubscriptionSuccess />} />
              <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/community-guidelines" element={<CommunityGuidelines />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </React.Suspense>
          </main>
          {!fullscreen && <BottomNav />}
        </AppMainWrapper>
      </div>
    </BrowserRouter>
  );
}

function SubscriptionSuccess() {
  return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:16}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <h3>You're subscribed!</h3>
      <p>Welcome to Clocked Pro. Enjoy unlimited review access.</p>
      <a href="/" className="btn btn-primary" style={{ marginTop: 20 }}>Back to Feed</a>
    </div>
  );
}

function SubscriptionCancel() {
  return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <h3>No worries</h3>
      <p>You can subscribe anytime from your profile.</p>
      <a href="/" className="btn btn-secondary" style={{ marginTop: 20 }}>Back to Feed</a>
    </div>
  );
}

function NotFound() {
  return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <h3>Page not found</h3>
      <a href="/" className="btn btn-secondary" style={{ marginTop: 16 }}>Go Home</a>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <NotifProvider>
            <MessagingProvider>
              <AppInner />
            </MessagingProvider>
          </NotifProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
