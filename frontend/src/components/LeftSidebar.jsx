import React from 'react';
import ClockedLogo from './ClockedLogo';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';

function NavItem({ icon, label, path, collapsed, active, onClick, badge }) {
  return (
    <button
      className={`sidebar-nav-item${active ? ' active' : ''}`}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      <span className="sidebar-nav-icon" style={{ position: 'relative' }}>
        {icon}
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -6,
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700, lineHeight: 1,
            minWidth: 16, height: 16, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      {!collapsed && <span className="sidebar-nav-label">{label}</span>}
    </button>
  );
}

export default function LeftSidebar({ collapsed = false }) {
  const { unreadCount } = useNotif();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeSort = searchParams.get('sort') || 'latest';
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/search';
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`left-sidebar${collapsed ? ' collapsed' : ''}`}>

      {/* Main nav */}
      <NavItem collapsed={collapsed} active={isActive('/')} label="Home" onClick={() => navigate('/')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>}
      />
      <NavItem collapsed={collapsed} active={isActive('/create')} label="Create" onClick={() => user?.email ? navigate('/create') : navigate('/signup')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
      />
      <NavItem collapsed={collapsed} active={isActive('/notifications')} label="Alerts" onClick={() => navigate('/notifications')}
        badge={unreadCount}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
      />
      <NavItem collapsed={collapsed} active={isActive('/profile')} label="Profile" onClick={() => navigate('/profile')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
      />
      <NavItem collapsed={collapsed} active={isActive('/messages')} label="Messages" onClick={() => navigate('/messages')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
      />
      <NavItem collapsed={collapsed} active={isActive('/saved')} label="Saved" onClick={() => navigate('/saved')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
      />

      <div className="sidebar-divider" />

      {/* Feed filters */}
      <NavItem collapsed={collapsed} active={activeSort === 'latest' && isActive('/')} label="Latest" onClick={() => navigate('/')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>}
      />
      <NavItem collapsed={collapsed} active={activeSort === 'top'} label="Top Rated" onClick={() => navigate('/?sort=top')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>}
      />

      <div style={{ flex: 1 }} />

      <div className="sidebar-divider" />

      {/* Dark/Light mode toggle */}
      <NavItem
        collapsed={collapsed}
        active={false}
        label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        onClick={toggle}
        icon={theme === 'dark' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        )}
      />

      {/* About — only expanded */}
      {!collapsed && (
        <div className="sidebar-about">
          <a href="/terms" className="sidebar-about-link">Terms</a>
          <a href="/privacy" className="sidebar-about-link">Privacy</a>
          <a href="/community-guidelines" className="sidebar-about-link">Guidelines</a>
          <a href="/contact" className="sidebar-about-link">Contact</a>
          <div className="sidebar-version">v1.0.0</div>
        </div>
      )}
    </div>
  );
}
