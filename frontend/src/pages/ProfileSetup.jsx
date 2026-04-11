import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

function AvatarCircle({ avatarUrl, displayName, size = 96 }) {
  const letter = displayName ? displayName[0].toUpperCase() : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
      fontSize: size * 0.38, fontWeight: 700, color: 'white', userSelect: 'none',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : letter}
    </div>
  );
}

const CITIES = [
  'Grand Rapids, MI', 'Detroit, MI', 'Lansing, MI', 'Ann Arbor, MI',
  'Chicago, IL', 'New York, NY', 'Los Angeles, CA', 'Houston, TX',
  'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
  'Dallas, TX', 'Nashville, TN', 'Charlotte, NC', 'Atlanta, GA',
  'Seattle, WA', 'Denver, CO', 'Boston, MA', 'Portland, OR',
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [location, setLocation] = useState(localStorage.getItem('userLocation') || '');
  const [locationInput, setLocationInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

  // Lock EVERYTHING — block all interaction with the rest of the app until setup is done
  useEffect(() => {
    // Freeze body scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Block back/forward navigation
    window.history.pushState({ profileSetup: true }, '');
    const handlePop = () => window.history.pushState({ profileSetup: true }, '');
    window.addEventListener('popstate', handlePop);

    // Block tab close
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  function validateUsername(val) {
    if (!val) return 'Username is required';
    if (!USERNAME_REGEX.test(val)) return 'Letters, numbers, underscores, periods only (3–20 chars)';
    return '';
  }

  function handleUsernameChange(e) {
    const val = e.target.value.replace(/\s/g, '');
    setUsername(val);
    setUsernameError(validateUsername(val));
  }

  async function handleStep1Next(e) {
    e.preventDefault();
    if (!displayName.trim()) return addToast('Display name is required');
    const err = validateUsername(username);
    if (err) { setUsernameError(err); return; }

    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', {
        display_name: displayName.trim(),
        username: username,
      });
      setUser(res.data.user);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save profile';
      if (err.response?.status === 409) setUsernameError(msg);
      else addToast(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleStep2Next() {
    setSaving(true);
    try {
      if (avatarUrl) {
        const res = await api.patch('/auth/profile', { avatar_url: avatarUrl });
        setUser(res.data.user);
      }
    } catch { /* non-critical */ } finally {
      setSaving(false);
      setStep(3);
    }
  }

  function handleFinish() {
    const loc = locationInput.trim() || location;
    if (loc) {
      localStorage.setItem('userLocation', loc);
      window.dispatchEvent(new CustomEvent('locationchange', { detail: { city: loc } }));
    }
    navigate('/');
  }

  const step1Complete = displayName.trim().length > 0 && username.length >= 3 && !usernameError;

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'var(--bg-primary)',
      // Intercept ALL pointer events — nothing behind can be clicked
      pointerEvents: 'all',
      overflow: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--bg-card)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        padding: '36px 32px',
      }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? '#A855F7' : 'var(--border)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* ── Step 1: Identity ── */}
        {step === 1 && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
              Set up your identity
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 4px' }}>
              This is how other users will see you on Clocked.
            </p>
            <p style={{ color: '#A855F7', fontSize: 13, fontWeight: 600, margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Keep it anonymous — don't use your real name
            </p>

            <form onSubmit={handleStep1Next}>
              <div className="form-group">
                <label className="form-label">Display Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  className="form-input"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Night Owl or TechWorker99"
                  maxLength={50}
                  autoFocus
                  required
                />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                  Pick any name — keep it anonymous.
                </p>
              </div>

              <div className="form-group" style={{ marginTop: 20 }}>
                <label className="form-label">@Username <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', fontSize: 15, pointerEvents: 'none',
                  }}>@</span>
                  <input
                    className="form-input"
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    placeholder="yourhandle"
                    maxLength={20}
                    style={{ paddingLeft: 28 }}
                    required
                  />
                </div>
                {usernameError ? (
                  <p style={{ fontSize: 12, color: '#EF4444', margin: '6px 0 0' }}>{usernameError}</p>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                    Your unique handle. Letters, numbers, underscores, periods only.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={saving || !step1Complete}
                style={{ marginTop: 28, opacity: step1Complete ? 1 : 0.5 }}
              >
                {saving ? 'Saving...' : 'Next →'}
              </button>

              {!step1Complete && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
                  Enter a display name and username to continue
                </p>
              )}
            </form>
          </>
        )}

        {/* ── Step 2: Profile Picture ── */}
        {step === 2 && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
              Add a profile picture
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 28px' }}>
              Optional — you can skip this and add one later.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div
                style={{ cursor: 'pointer', position: 'relative' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <AvatarCircle avatarUrl={avatarUrl} displayName={displayName} size={110} />
                <div style={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-card)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => fileInputRef.current?.click()} type="button">
                Choose Photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 24px' }}>
              Avoid real photos. Keep it anonymous.
            </p>

            <button className="btn btn-primary btn-full" onClick={handleStep2Next} disabled={saving}>
              {saving ? 'Saving...' : avatarUrl ? 'Next →' : 'Skip →'}
            </button>
          </>
        )}

        {/* ── Step 3: Location ── */}
        {step === 3 && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
              Where are you located?
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px' }}>
              Helps show you relevant reviews in your area. You can change this anytime.
            </p>

            <div className="form-group">
              <label className="form-label">Your City</label>
              <input
                className="form-input"
                type="text"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                placeholder="e.g. Grand Rapids, MI"
                autoFocus
              />
            </div>

            {/* Quick-select common cities */}
            <div style={{ marginTop: 12, marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Or pick one:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CITIES.slice(0, 8).map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setLocationInput(city)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: locationInput === city ? '#A855F7' : 'var(--bg-elevated)',
                      color: locationInput === city ? '#fff' : 'var(--text-primary)',
                      border: `1px solid ${locationInput === city ? '#A855F7' : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary btn-full" onClick={handleFinish}>
              {locationInput.trim() ? 'Finish' : 'Skip for now'}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
