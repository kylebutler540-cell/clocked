import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

// Load GSI script once globally
let gsiScriptLoaded = false;
let gsiScriptLoading = false;
const gsiCallbacks = [];

function loadGSI(cb) {
  if (gsiScriptLoaded) { cb(); return; }
  gsiCallbacks.push(cb);
  if (gsiScriptLoading) return;
  gsiScriptLoading = true;
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.defer = true;
  s.onload = () => {
    gsiScriptLoaded = true;
    gsiScriptLoading = false;
    gsiCallbacks.splice(0).forEach(fn => fn());
  };
  s.onerror = () => { gsiScriptLoading = false; };
  document.head.appendChild(s);
}

export default function GoogleSignInButton({ onCredential, label = 'Sign in with Google', style = {} }) {
  const wrapRef = useRef(null);
  // Use a ref for onCredential so the GSI callback always sees the latest version
  const onCredentialRef = useRef(onCredential);
  useEffect(() => { onCredentialRef.current = onCredential; }, [onCredential]);

  function renderButton() {
    const el = wrapRef.current;
    if (!el || !window.google?.accounts?.id) return;

    const w = Math.floor(el.getBoundingClientRect().width) || 340;

    // Fully re-initialize with latest callback ref
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (!response?.credential) return; // user dismissed popup — do nothing
        onCredentialRef.current?.(response.credential);
      },
      cancel_on_tap_outside: false,
      ux_mode: 'popup',
    });

    el.innerHTML = '';
    window.google.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      width: w,
      shape: 'pill',
      text: 'signin_with',
      logo_alignment: 'left',
    });
  }

  useEffect(() => {
    loadGSI(renderButton);
    // Re-render button when tab regains focus (Google requires this)
    const onFocus = () => { if (gsiScriptLoaded) renderButton(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []); // eslint-disable-line

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 24, overflow: 'hidden', minHeight: 44, ...style }}>
      {/* Real GSI button (hidden behind overlay, still clickable) */}
      <div ref={wrapRef} style={{ width: '100%', display: 'block' }} />

      {/* Visual overlay — passes clicks through to the GSI button */}
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
        color: 'var(--text-primary)',
        borderRadius: 24,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        zIndex: 10,
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
