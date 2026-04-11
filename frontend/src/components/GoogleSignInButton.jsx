import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';

export default function GoogleSignInButton({ onCredential, label = 'Sign in with Google', style = {} }) {
  const btnRef = useRef(null);

  useEffect(() => {
    function init() {
      if (!btnRef.current) return;
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredential?.(response.credential),
      });
      window.google?.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        width: btnRef.current.offsetWidth || 340,
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
      className="google-btn-wrap"
      style={{
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div ref={btnRef} style={{ width: '100%' }} />
    </div>
  );
}
