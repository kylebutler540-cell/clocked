import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

// ─── Crop Modal ───────────────────────────────────────────────────────────────
function CropModal({ rawDataUrl, onConfirm, onCancel }) {
  const [cropScale, setCropScale] = useState(1.5);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  // Mouse drag
  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y };
  };
  const handleMouseMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
    setCropOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [dragging]);
  const handleMouseUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  // Touch drag
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - cropOffset.x,
        y: e.touches[0].clientY - cropOffset.y,
      };
    }
  };
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && dragging && dragStart.current) {
      e.preventDefault();
      setCropOffset({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
    // Pinch to zoom
    if (e.touches.length === 2) {
      // handled via onTouchMove directly — skip here (needs prev distance)
    }
  }, [dragging]);
  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  // Pinch zoom state
  const lastPinchDist = useRef(null);
  const handlePinchMove = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current !== null) {
        const delta = dist - lastPinchDist.current;
        setCropScale(prev => Math.min(4, Math.max(1, prev + delta * 0.01)));
      }
      lastPinchDist.current = dist;
    } else {
      lastPinchDist.current = null;
    }
  };

  // Scroll wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setCropScale(prev => Math.min(4, Math.max(1, prev + delta)));
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  function handleConfirm() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    const centerX = nw / 2 - cropOffset.x * (nw / (200 * cropScale));
    const centerY = nh / 2 - cropOffset.y * (nh / (200 * cropScale));
    const visibleSize = 200 / cropScale;

    ctx.drawImage(
      img,
      centerX - visibleSize / 2,
      centerY - visibleSize / 2,
      visibleSize,
      visibleSize,
      0, 0, 400, 400
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onConfirm(dataUrl);
  }

  const PREVIEW = 200;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 24,
      }}
    >
      <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>
        Drag &amp; scroll to adjust
      </p>

      {/* Circular clip area */}
      <div
        style={{
          width: PREVIEW, height: PREVIEW,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid #A855F7',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          position: 'relative',
          background: '#111',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={(e) => { handleTouchMove(e); handlePinchMove(e); }}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <img
          ref={imgRef}
          src={rawDataUrl}
          alt="crop"
          style={{
            position: 'absolute',
            width: PREVIEW * cropScale,
            height: PREVIEW * cropScale,
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
            transformOrigin: 'center center',
            userSelect: 'none',
            pointerEvents: 'none',
            draggable: false,
          }}
          draggable={false}
        />
      </div>

      {/* Zoom slider hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Zoom:</span>
        <input
          type="range"
          min={1} max={4} step={0.05}
          value={cropScale}
          onChange={e => setCropScale(parseFloat(e.target.value))}
          style={{ width: 140 }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{cropScale.toFixed(1)}×</span>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 28px', borderRadius: 8, fontWeight: 600, fontSize: 14,
            background: 'var(--bg-elevated, #1a1a2e)', color: 'var(--text-primary, #fff)',
            border: '1px solid var(--border, #333)', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          style={{
            padding: '10px 28px', borderRadius: 8, fontWeight: 600, fontSize: 14,
            background: '#A855F7', color: '#fff',
            border: 'none', cursor: 'pointer',
          }}
        >
          Confirm
        </button>
      </div>

      {/* Hidden canvas for rendering the crop */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('mode') === 'edit';

  const { user, setUser } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(isEditMode ? (user?.display_name || '') : '');
  const [username, setUsername] = useState(isEditMode ? (user?.username || '') : '');
  const [avatarUrl, setAvatarUrl] = useState(isEditMode ? (user?.avatar_url || '') : (user?.avatar_url || ''));
  const [location, setLocation] = useState(localStorage.getItem('userLocation') || '');
  const [locationInput, setLocationInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);

  // Crop modal state
  const [cropRawUrl, setCropRawUrl] = useState(null); // non-null = modal open
  const fileInputRef = useRef(null);

  const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

  // ── New account mode: lock everything
  useEffect(() => {
    if (isEditMode) return; // edit mode: no locks

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    window.history.pushState({ profileSetup: true }, '');
    const handlePop = () => window.history.pushState({ profileSetup: true }, '');
    window.addEventListener('popstate', handlePop);

    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditMode]);

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

  // File selected → open crop modal instead of setting directly
  function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected if user cancels
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => setCropRawUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleCropConfirm(croppedDataUrl) {
    setAvatarUrl(croppedDataUrl);
    setCropRawUrl(null);
  }

  function handleCropCancel() {
    setCropRawUrl(null);
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
      if (isEditMode) {
        navigate('/profile');
      } else {
        setStep(3);
      }
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
  const totalSteps = isEditMode ? 2 : 3;

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'var(--bg-primary)',
      pointerEvents: 'all',
      overflow: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--bg-card)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        padding: '36px 32px',
        position: 'relative',
      }}>

        {/* Back button — edit mode only */}
        {isEditMode && (
          <button
            onClick={() => navigate(-1)}
            style={{
              position: 'absolute', top: 16, left: 16,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 14, padding: '4px 8px', borderRadius: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        )}

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
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
              {isEditMode ? 'Edit Profile' : 'Set up your identity'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 4px' }}>
              This is how other users will see you on Clocked.
            </p>
            {!isEditMode && (
              <p style={{ color: '#A855F7', fontSize: 13, fontWeight: 600, margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Keep it anonymous — don't use your real name
              </p>
            )}
            {isEditMode && <div style={{ marginBottom: 24 }} />}

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
                {!isEditMode && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                    Pick any name — keep it anonymous.
                  </p>
                )}
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
              {isEditMode ? 'Edit Profile' : 'Add a profile picture'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 28px' }}>
              {isEditMode ? 'Update your profile picture.' : 'Optional — you can skip this and add one later.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div
                style={{ cursor: 'pointer', position: 'relative' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <AvatarCircle avatarUrl={avatarUrl} displayName={displayName || user?.display_name} size={110} />
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

            {!isEditMode && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 24px' }}>
                Avoid real photos. Keep it anonymous.
              </p>
            )}

            <button className="btn btn-primary btn-full" onClick={handleStep2Next} disabled={saving}>
              {saving ? 'Saving...' : isEditMode ? 'Save Changes' : (avatarUrl ? 'Next →' : 'Skip →')}
            </button>
          </>
        )}

        {/* ── Step 3: Location (new account only) ── */}
        {step === 3 && !isEditMode && (
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

  return (
    <>
      {createPortal(content, document.body)}
      {cropRawUrl && (
        <CropModal
          rawDataUrl={cropRawUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
