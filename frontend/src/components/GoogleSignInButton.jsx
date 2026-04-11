import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

let gsiReady = false;
let gsiQueue = [];
function loadGSI(cb) {
  if (gsiReady) { cb(); return; }
  gsiQueue.push(cb);
  if (gsiQueue.length > 1) return;
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onload = () => { gsiReady = true; gsiQueue.forEach(f => f()); gsiQueue = []; };
  document.body.appendChild(s);
}

export default function GoogleSignInButton({ onCredential, label = 'Sign in with Google', style = {} }) {
  const wrapRef = useRef(null);

  function render() {
    if (!wrapRef.current || !window.google?.accounts?.id) return;
    const w = wrapRef.current.getBoundingClientRect().width || 340;
    try { window.google.accounts.id.cancel(); } catch {}
    wrapRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (r) => onCredential?.(r.credential),
      cancel_on_tap_outside: false,
    });
    window.google.accounts.id.renderButton(wrapRef.current, {
      theme: 'outline',
      size: 'large',
      width: Math.floor(w),
      shape: 'pill',
      text: 'signin_with',
      logo_alignment: 'left',
      // popup mode works on both — on desktop it opens a centered window
      ux_mode: 'popup',
    });
  }

  useEffect(() => { loadGSI(render); }, []);

  useEffect(() => {
    const reinit = () => { if (!document.hidden) loadGSI(render); };
    document.addEventListener('visibilitychange', reinit);
    window.addEventListener('focus', reinit);
    return () => {
      document.removeEventListener('visibilitychange', reinit);
      window.removeEventListener('focus', reinit);
    };
  }, [onCredential]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* GSI button fills full width */}
      <div ref={wrapRef} style={{ width: '100%', display: 'block' }} />

      {/* Label overlay — pointer-events:none so clicks pass to GSI */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        pointerEvents: 'none',
        fontSize: 14,
        fontWeight: 600,
        color: '#3c4043',
        borderRadius: 24,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {label}
      </div>
    </div>
  );
}
