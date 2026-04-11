import React, { useState } from 'react';
import ClockedLogo from './ClockedLogo';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LocationModal from './LocationModal';
import { useTheme } from '../context/ThemeContext';

export default function SideDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSort = searchParams.get('sort') || 'latest';
  const [location, setLocation] = useState(() => localStorage.getItem('userLocation') || '');
  const [showLocation, setShowLocation] = useState(false);
  const { theme, toggle } = useTheme();

  function handleSort(sort) {
    navigate(sort === 'latest' ? '/' : `/?sort=${sort}`);
    onClose();
  }

  function handleLocationClose(city) {
    if (city) {
      setLocation(city);
      localStorage.setItem('userLocation', city);
    }
    setShowLocation(false);
  }

  return (
    <>
      <div
        className={`drawer-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />
      <div className={`side-drawer${isOpen ? ' open' : ''}`}>
        <div className="drawer-header">
          <ClockedLogo height={40} />
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

          <button
            className="drawer-nav-item"
            onClick={() => { navigate('/saved'); onClose(); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            Saved
          </button>

          <button
            className="drawer-nav-item"
            onClick={() => setShowLocation(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {location || 'Set Location'}
          </button>
        </nav>

        <div className="drawer-divider" />



        <div className="drawer-spacer" />

        <div className="drawer-divider" />

        <button className="drawer-nav-item" onClick={toggle} style={{ margin: '8px 16px' }}>
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <div className="drawer-about">
          <div className="drawer-about-title">About</div>
          <a href="#" className="drawer-about-link" onClick={() => { onClose(); navigate('/terms'); }}>Terms of Service</a>
          <a href="#" className="drawer-about-link" onClick={() => { onClose(); navigate('/privacy'); }}>Privacy Policy</a>
          <a href="#" className="drawer-about-link" onClick={() => { onClose(); navigate('/community-guidelines'); }}>Community Guidelines</a>
          <a href="#" className="drawer-about-link" onClick={() => { onClose(); navigate('/contact'); }}>Contact Us</a>
          <div className="drawer-version">Version 1.0.1</div>
        </div>
      </div>

      {showLocation && <LocationModal onClose={handleLocationClose} />}
    </>
  );
}

// v2
