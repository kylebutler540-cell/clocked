import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMessaging } from '../context/MessagingContext';
import { useNotif } from '../context/NotifContext';

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { path: '/', label: 'Home', Icon: HomeIcon },
  { path: '/messages', label: 'Messages', Icon: MessagesIcon },
  { path: '/profile', label: 'Profile', Icon: ProfileIcon },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadMessages } = useNotif();
  const { fullscreen } = useMessaging();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => {
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path);
        const showBadge = item.path === '/messages' && unreadMessages > 0;

        return (
          <button
            key={item.path}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => {
              if (item.path === '/messages' && location.pathname.startsWith('/messages/')) {
                navigate('/messages');
              } else {
                navigate(item.path);
              }
            }}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <item.Icon />
              {showBadge && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: '#ef4444', color: '#fff',
                  fontSize: 10, fontWeight: 700, lineHeight: 1,
                  minWidth: 16, height: 16, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
