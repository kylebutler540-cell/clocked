import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

function NavItem({ icon, label, path, collapsed, active, onClick }) {
  return (
    <button
      className={`sidebar-nav-item${active ? ' active' : ''}`}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      <span className="sidebar-nav-icon">{icon}</span>
      {!collapsed && <span className="sidebar-nav-label">{label}</span>}
    </button>
  );
}

export default function LeftSidebar({ collapsed = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeSort = searchParams.get('sort') || 'latest';

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/search';
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`left-sidebar${collapsed ? ' collapsed' : ''}`}>

      {/* Logo — only when expanded */}
      {!collapsed && (
        <div className="sidebar-logo" onClick={() => navigate('/')}>clocked</div>
      )}

      <div className="sidebar-divider" />

      {/* Main nav */}
      <NavItem collapsed={collapsed} active={isActive('/')} label="Home" onClick={() => navigate('/')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>}
      />
      <NavItem collapsed={collapsed} active={isActive('/create')} label="Create" onClick={() => navigate('/create')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
      />
      <NavItem collapsed={collapsed} active={isActive('/notifications')} label="Alerts" onClick={() => navigate('/notifications')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
      />
      <NavItem collapsed={collapsed} active={isActive('/profile')} label="Profile" onClick={() => navigate('/profile')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
      />

      <div className="sidebar-divider" />

      {/* Feed filters */}
      <NavItem collapsed={collapsed} active={activeSort === 'latest' && isActive('/')} label="Latest" onClick={() => navigate('/')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>}
      />
      <NavItem collapsed={collapsed} active={activeSort === 'top'} label="Top Rated" onClick={() => navigate('/?sort=top')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>}
      />
      <NavItem collapsed={collapsed} active={activeSort === 'history'} label="History" onClick={() => navigate('/?sort=history')}
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.57"/><polyline points="12,7 12,12 15,15"/></svg>}
      />

      <div style={{ flex: 1 }} />

      {/* Premium */}
      {!collapsed && (
        <button className="sidebar-premium" onClick={() => navigate('/profile')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
          Go Premium — $2.99/mo
        </button>
      )}

      {/* About — only expanded */}
      {!collapsed && (
        <div className="sidebar-about">
          <a href="#" className="sidebar-about-link">Terms</a>
          <a href="#" className="sidebar-about-link">Privacy</a>
          <a href="#" className="sidebar-about-link">Contact</a>
          <div className="sidebar-version">v1.0.0</div>
        </div>
      )}
    </div>
  );
}
