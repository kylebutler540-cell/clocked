import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function SideDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSort = searchParams.get('sort') || 'latest';

  function handleSort(sort) {
    navigate(sort === 'latest' ? '/' : `/?sort=${sort}`);
    onClose();
  }

  return (
    <>
      <div
        className={`drawer-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />
      <div className={`side-drawer${isOpen ? ' open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-logo">clocked</div>
          <button className="drawer-close" onClick={onClose} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="drawer-nav">
          <button
            className={`drawer-nav-item${activeSort === 'latest' ? ' active' : ''}`}
            onClick={() => handleSort('latest')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            Latest
          </button>

          <button
            className={`drawer-nav-item${activeSort === 'top' ? ' active' : ''}`}
            onClick={() => handleSort('top')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
            </svg>
            Top Rated
          </button>

          <button
            className={`drawer-nav-item${activeSort === 'history' ? ' active' : ''}`}
            onClick={() => handleSort('history')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1,4 1,10 7,10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4.57" />
              <polyline points="12,7 12,12 15,15" />
            </svg>
            History
          </button>
        </nav>

        <div className="drawer-divider" />

        <button
          className="drawer-premium"
          onClick={() => { navigate('/profile'); onClose(); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
          Go Premium — $2.99/month
        </button>

        <div className="drawer-spacer" />

        <div className="drawer-about">
          <div className="drawer-about-title">About</div>
          <a href="#" className="drawer-about-link" onClick={onClose}>Terms of Service</a>
          <a href="#" className="drawer-about-link" onClick={onClose}>Privacy Policy</a>
          <a href="#" className="drawer-about-link" onClick={onClose}>Community Guidelines</a>
          <a href="#" className="drawer-about-link" onClick={onClose}>Contact Us</a>
          <div className="drawer-version">Version 1.0.0</div>
        </div>
      </div>
    </>
  );
}
