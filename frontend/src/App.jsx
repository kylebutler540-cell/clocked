import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

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

function Header({ onOpenDrawer }) {
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
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
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

  if (isHome) {
    return <Header onOpenDrawer={onOpenDrawer} />;
  }

  if (title) {
    return (
      <header className="app-header" style={{ justifyContent: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
      </header>
    );
  }

  return null;
}

function AppInner() {
  const [drawerOpen, setDrawerOpen] = useState(false);
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
      <div className="app-layout">
        <LeftSidebar />
        <div className="app-main">
        <PageHeader onOpenDrawer={() => setDrawerOpen(true)} />
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
        </div>
      </div>
    </BrowserRouter>
  );
}

function SubscriptionSuccess() {
  return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <div className="empty-state-icon">🎉</div>
      <h3>You're subscribed!</h3>
      <p>Welcome to Clocked Pro. Enjoy unlimited review access.</p>
      <a href="/" className="btn btn-primary" style={{ marginTop: 20 }}>Back to Feed</a>
    </div>
  );
}

function SubscriptionCancel() {
  return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <div className="empty-state-icon">↩️</div>
      <h3>No worries</h3>
      <p>You can subscribe anytime from your profile.</p>
      <a href="/" className="btn btn-secondary" style={{ marginTop: 20 }}>Back to Feed</a>
    </div>
  );
}

function NotFound() {
  return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <div className="empty-state-icon">🤷</div>
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
