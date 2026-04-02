import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

function AvatarCircle({ avatarUrl, displayName, size = 96 }) {
  const letter = displayName ? displayName[0].toUpperCase() : '?';
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      fontSize: size * 0.38,
      fontWeight: 700,
      color: 'white',
      userSelect: 'none',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : letter
      }
    </div>
  );
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

  function validateUsername(val) {
    if (!val) return '';
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
    if (err) return setUsernameError(err);

    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', {
        display_name: displayName.trim(),
        username: username || undefined,
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

  async function handleFinish() {
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', { avatar_url: avatarUrl || null });
      setUser(res.data.user);
    } catch {
      // Non-critical — still proceed
    } finally {
      setSaving(false);
      navigate('/');
    }
  }

  function handleSkipAvatar() {
    navigate('/');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'var(--bg-base)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'var(--bg-card)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        padding: '36px 32px',
      }}>

        {step === 1 && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
              Set up your identity
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 4px' }}>
              This is how other users will see you on Clocked.
            </p>
            <p style={{ color: '#A855F7', fontSize: 13, fontWeight: 600, margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Keep it anonymous — don't use your real name
            </p>

            <form onSubmit={handleStep1Next}>
              <div className="form-group">
                <label className="form-label">Display Name</label>
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
                  Pick any name — keep it anonymous. Avoid your real name or anything people could recognize.
                </p>
              </div>

              <div className="form-group" style={{ marginTop: 20 }}>
                <label className="form-label">@Username</label>
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
                  />
                </div>
                {usernameError ? (
                  <p style={{ fontSize: 12, color: '#EF4444', margin: '6px 0 0' }}>{usernameError}</p>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                    Your unique handle. Letters, numbers, underscores, periods only. Optional.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={saving}
                style={{ marginTop: 28 }}
              >
                {saving ? 'Saving...' : 'Next'}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
              Add a profile picture
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 28px' }}>
              Optional — you can skip this.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div
                style={{ cursor: 'pointer', position: 'relative' }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to upload photo"
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
              <button
                className="btn btn-secondary"
                style={{ fontSize: 13 }}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Choose Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarFile}
              />
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 24px' }}>
              Avoid real photos of yourself or anything that could identify you. Keep it anonymous.
            </p>

            <button
              className="btn btn-primary btn-full"
              onClick={handleFinish}
              disabled={saving || !avatarUrl}
            >
              {saving ? 'Saving...' : 'Finish'}
            </button>
            <button
              className="btn btn-ghost btn-full"
              onClick={handleSkipAvatar}
              style={{ marginTop: 10 }}
              type="button"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
