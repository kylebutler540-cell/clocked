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
function DesktopTopBar({ sidebarCollapsed, onToggleSidebar }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSearchSelect(place) {
    navigate(`/company/${place.place_id}`, {
      state: { name: place.name, address: place.address },
    });
  }

  return (
    <div className="desktop-topbar">
      {/* Left: collapse button + logo */}
      <div className="desktop-topbar-left">
        <button className="collapse-btn" onClick={onToggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="desktop-logo" onClick={() => navigate('/')}>clocked</div>
      </div>

      {/* Center: purple search bar */}
      <div className="desktop-topbar-search">
        <EmployerSearch onSelect={handleSearchSelect} placeholder="Search employers..." />
      </div>

      {/* Right: login + menu */}
      <div className="desktop-topbar-right">
        {user?.email ? (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </span>
        ) : (
          <button className="btn btn-primary" style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => navigate('/signup')}>
            Log In
          </button>
        )}
        <div style={{ position: 'relative' }}>
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

function PageHeader({ onOpenDrawer }) {
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/search';
  const title = PAGE_TITLES[location.pathname];

  if (isHome) return <MobileHeader onOpenDrawer={onOpenDrawer} />;
  if (title) {
    return (
      <header className="app-header" style={{ justifyContent: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
      </header>
    );
  }
  return null;
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
      {/* Desktop top bar */}
      <DesktopTopBar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(v => !v)} />

      <div className={`app-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <LeftSidebar collapsed={sidebarCollapsed} />
        <AppMainWrapper>
          {/* Mobile header only */}
          <div className="mobile-only-header">
            <PageHeader onOpenDrawer={() => setDrawerOpen(true)} />
          </div>
          <SideDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
