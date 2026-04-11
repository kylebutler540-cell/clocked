import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

/**
 * Custom-styled Google sign-in button.
 * Renders the real GSI button invisibly and overlays our custom button on top.
 * This ensures clicks actually go through to Google's sign-in flow.
 */
export default function GoogleSignInButton({ onCredential, label = 'Sign in with Google', style = {} }) {
  const containerRef = useRef(null);
  const gsiRef = useRef(null);

  useEffect(() => {
    function init() {
      if (!gsiRef.current) return;
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          onCredential?.(response.credential);
        },
      });
      window.google?.accounts.id.renderButton(gsiRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        type: 'standard',
        shape: 'pill',
        text: 'signin_with',
      });
    }

    if (window.google) { init(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Real GSI button — fills container, invisible but clickable */}
      <div
        ref={gsiRef}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          opacity: 0,
          zIndex: 2,
          overflow: 'hidden',
          cursor: 'pointer',
          // Scale up to fill the container so the click target is the whole button
          transform: 'scale(3)',
          transformOrigin: 'center center',
        }}
      />

      {/* Custom visible button — our styling */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '12px 20px',
          borderRadius: 24,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          userSelect: 'none',
          zIndex: 1,
          position: 'relative',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
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
