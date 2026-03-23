import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';

import BottomNav from './components/BottomNav';
import SideDrawer from './components/SideDrawer';
import LeftSidebar from './components/LeftSidebar';
import EmployerSearch from './components/EmployerSearch';
import LocationModal from './components/LocationModal';

import Home from './pages/Home';
import Create from './pages/Create';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import CompanyProfile from './pages/CompanyProfile';
import Saved from './pages/Saved';
import Onboarding from './pages/Onboarding';
import Signup from './pages/Signup';

const PAGE_TITLES = {
  '/create': 'Create Post',
  '/notifications': 'Alerts',
  '/profile': 'Profile',
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
      {showModal && <LocationModal onClose={(city) => { if (city) setLocation(city); setShowModal(false); }} />}
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

function DesktopTopBar({ sidebarCollapsed, onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
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

  function handleSearchSelect(place) {
    navigate(`/company/${place.place_id}`, {
      state: { name: place.name, address: place.address },
    });
  }

  return (
    <div className="desktop-topbar">
      {/* Left: collapse button + logo + back button */}
      <div className="desktop-topbar-left">
        <button className="collapse-btn" onClick={onToggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="desktop-logo" onClick={() => navigate('/')}>clocked</div>

      </div>

      {/* Center: location pill + purple search bar */}
      <div className="desktop-topbar-search" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LocationPill />
        <div style={{ flex: 1 }}>
          <EmployerSearch onSelect={handleSearchSelect} placeholder="Search employers..." />
        </div>
      </div>
      {showGetApp && <GetAppModal onClose={() => setShowGetApp(false)} />}

      {/* Right: get app + login + menu */}
      <div className="desktop-topbar-right">
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
          onClick={() => setShowGetApp(true)}
        >
          Get App
        </button>
        {user?.email ? (
          <div
            onClick={() => navigate('/profile')}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', flexShrink: 0,
              userSelect: 'none',
            }}
            title={user.email}
          >
            {user.email[0].toUpperCase()}
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
            <div className="topbar-dropdown" onClick={() => setMenuOpen(false)}>
              {user?.email ? (
                <>
                  <button className="topbar-dropdown-item" onClick={() => navigate('/profile')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profile
                  </button>
                  <button className="topbar-dropdown-item" onClick={() => navigate('/profile')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                    Go Pro — $2.99/mo
                  </button>
                  <div className="topbar-dropdown-divider" />
                </>
              ) : (
                <>
                  <button className="topbar-dropdown-item" onClick={() => navigate('/signup')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Log In / Sign Up
                  </button>
                  <button className="topbar-dropdown-item" onClick={() => navigate('/profile')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                    Go Pro — $2.99/mo
                  </button>
                  <div className="topbar-dropdown-divider" />
                </>
              )}
              <button className="topbar-dropdown-item" onClick={toggle}>
                {theme === 'dark' ? (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>Light Mode</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>Dark Mode</>
                )}
              </button>
              {user?.email && (
                <>
                  <div className="topbar-dropdown-divider" />
                  <button className="topbar-dropdown-item" style={{ color: '#EF4444' }} onClick={() => { logout(); navigate('/'); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign Out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile header
function MobileHeader({ onOpenDrawer }) {
  const navigate = useNavigate();

  function handleSearchSelect(place) {
    navigate(`/company/${place.place_id}`, {
      state: { name: place.name, address: place.address },
    });
  }

  return (
    <header className="app-header">
      <div className="app-logo" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/')}>
        clocked
      </div>
      <div className="header-right">
        <button className="hamburger-btn" onClick={onOpenDrawer} aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="header-search-wrapper">
          <EmployerSearch onSelect={handleSearchSelect} placeholder="Find anything..." />
        </div>
      </div>
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

function PageHeader({ onOpenDrawer }) {
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/search';
  const title = PAGE_TITLES[location.pathname];

  if (isHome) return <MobileHeader onOpenDrawer={onOpenDrawer} />;

  return (
    <header className="app-header" style={{ justifyContent: 'flex-start', gap: 12 }}>
      <BackButton />
      {title && <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>}
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
  const fullWidthRoutes = ['/signup', '/subscription/success', '/subscription/cancel'];
  const isFullWidth = fullWidthRoutes.includes(location.pathname);
  return (
    <div className={`app-main${isFullWidth ? ' full-width' : ''}`}>
      {children}
    </div>
  );
}

function AppInner() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('hasSeenOnboarding')
  );

  if (showOnboarding) {
    return (
      <BrowserRouter>
        <Onboarding onDone={() => setShowOnboarding(false)} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <DesktopTopBarWrapper sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(v => !v)} />
      <div className={`app-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <LeftSidebar collapsed={sidebarCollapsed} />
        <AppMainWrapper>
          {/* Mobile header only */}
          <div className="mobile-only-header">
            <PageHeader onOpenDrawer={() => setDrawerOpen(true)} />
          </div>
          <SideDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
          <DesktopBackButton />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Home />} />
              <Route path="/create" element={<Create />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/company/:placeId" element={<CompanyProfile />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/subscription/success" element={<SubscriptionSuccess />} />
              <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <BottomNav />
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
          <AppInner />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
