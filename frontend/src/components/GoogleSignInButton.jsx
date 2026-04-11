import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

// Load GSI script once globally
let gsiLoaded = false;
let gsiCallbacks = [];
function loadGSI(cb) {
  if (gsiLoaded) { cb(); return; }
  gsiCallbacks.push(cb);
  if (gsiCallbacks.length > 1) return; // already loading
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => {
    gsiLoaded = true;
    gsiCallbacks.forEach(fn => fn());
    gsiCallbacks = [];
  };
  document.body.appendChild(script);
}

export default function GoogleSignInButton({ onCredential, label = 'Sign in with Google', style = {} }) {
  const btnRef = useRef(null);
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    if (!wrapRef.current) return;
    const w = wrapRef.current.offsetWidth;
    setWidth(w > 0 ? w : 340);
  }, []);

  // Re-render GSI button every time component mounts or width changes
  useEffect(() => {
    if (!width || !btnRef.current) return;

    function render() {
      if (!btnRef.current || !window.google?.accounts?.id) return;
      // Cancel any pending One Tap to avoid conflicts
      try { window.google.accounts.id.cancel(); } catch {}
      // Clear previous render
      btnRef.current.innerHTML = '';
      // Initialize fresh
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredential?.(response.credential),
        cancel_on_tap_outside: false,
      });
      // Render with exact container width
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        width: width,
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
      });
    }

    loadGSI(render);
  }, [width, onCredential]);

  // Re-render when page becomes visible again (handles back navigation)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && btnRef.current && window.google?.accounts?.id) {
        btnRef.current.innerHTML = '';
        try { window.google.accounts.id.cancel(); } catch {}
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential?.(response.credential),
          cancel_on_tap_outside: false,
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          width: wrapRef.current?.offsetWidth || width,
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    // Also handle iOS back gesture via focus event
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [width, onCredential]);

  return (
    <div ref={wrapRef} className="google-btn-wrap" style={{ ...style }}>
      <div ref={btnRef} />
    </div>
  );
}
