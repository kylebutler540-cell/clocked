import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import EmployerSearch from '../components/EmployerSearch';
import BusinessLogo from '../components/BusinessLogo';
import CropModal from '../components/CropModal';

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

function WorkplacePlaceholderIcon({ size = 32 }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'var(--bg-elevated)', flexShrink: 0, color: 'var(--text-muted)' }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <path d="M9 12h6"/>
        <path d="M9 16h6"/>
      </svg>
    </div>
  );
}

function AvatarCircle({ avatarUrl, displayName, size = 90 }) {
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

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [workplaces, setWorkplaces] = useState(() => {
    if (user?.workplaces && Array.isArray(user.workplaces) && user.workplaces.length > 0) {
      return user.workplaces;
    }
    if (user?.workplace_place_id) {
      return [{ place_id: user.workplace_place_id, name: user.workplace_name, address: user.workplace_address }];
    }
    return [];
  });
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cropRawUrl, setCropRawUrl] = useState(null);

  // ── Username validation ────────────────────────────────────────────────────
  function validateUsername(val) {
    if (!val) return 'Username is required';
    if (!USERNAME_REGEX.test(val)) return 'Letters, numbers, underscores, periods only (3–20 chars)';
    return '';
  }

  const handleUsernameChange = useCallback((e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setUsername(val);
    setUsernameError(validateUsername(val));
  }, []);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropRawUrl(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleCropConfirm(croppedDataUrl) {
    setAvatarUrl(croppedDataUrl);
    setCropRawUrl(null);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    if (!displayName.trim()) return addToast('Display name is required');
    const unErr = validateUsername(username);
    if (unErr) return addToast(unErr);
    if (workplaces.length === 0) return addToast('At least one workplace is required');

    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', {
        display_name: displayName.trim(),
        username,
        avatar_url: avatarUrl || null,
        bio: bio.trim() || null,
        workplaces,
      });
      if (res.data.user && setUser) setUser(res.data.user);
      addToast('Profile saved!');
      navigate('/profile');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="edit-profile-page">
        {/* Header */}
        <div className="edit-profile-header">
          <button className="edit-profile-back" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="edit-profile-title">Edit Profile</h1>
          <div style={{ width: 40 }} />
        </div>

        <form onSubmit={handleSave} className="edit-profile-form">
          {/* Avatar */}
          <div className="edit-profile-avatar-wrap">
            <div className="edit-profile-avatar-btn" onClick={() => fileInputRef.current?.click()}>
              <AvatarCircle avatarUrl={avatarUrl} displayName={displayName || user?.display_name} size={90} />
              <div className="edit-profile-camera">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
          </div>

          {/* Display Name */}
          <div className="edit-profile-field">
            <label className="edit-profile-label">
              Display Name <span className="edit-profile-required">*</span>
            </label>
            <input
              className="form-input"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Night Owl or TechWorker99"
              maxLength={50}
              required
            />
          </div>

          {/* Username */}
          <div className="edit-profile-field">
            <label className="edit-profile-label">
              @Username <span className="edit-profile-required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span className="edit-profile-at">@</span>
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
            {usernameError && (
              <p className="edit-profile-error">{usernameError}</p>
            )}
          </div>

          {/* Workplaces (multi-job support) */}
          <div className="edit-profile-field">
            <label className="edit-profile-label">
              Jobs <span className="edit-profile-required">*</span>
            </label>

            {workplaces.length === 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--border)' }}>
                  <WorkplacePlaceholderIcon size={32} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No jobs added — search below to add one.</span>
                </div>
                <EmployerSearch
                  onSelect={(emp) => {
                    if (!workplaces.find(w => w.place_id === emp.place_id && w.name === emp.name)) {
                      setWorkplaces([...workplaces, emp]);
                    }
                  }}
                  placeholder="Search your workplace..."
                />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
                  {workplaces.map((wp, idx) => (
                    <div key={idx} className="edit-profile-workplace-selected">
                      {wp.place_id
                        ? <BusinessLogo placeId={wp.place_id} name={wp.name} size={32} borderRadius={6} />
                        : <WorkplacePlaceholderIcon size={32} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wp.name}</div>
                        {wp.address && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wp.address}</div>}
                      </div>
                      {idx > 0 && (
                        <button type="button" onClick={() => setWorkplaces(workplaces.filter((_, i) => i !== idx))} className="edit-profile-clear">×</button>
                      )}
                    </div>
                  ))}
                </div>

                {workplaces.length < 3 && (
                  <>
                    <EmployerSearch
                      onSelect={(emp) => {
                        if (!workplaces.find(w => w.place_id === emp.place_id && w.name === emp.name)) {
                          setWorkplaces([...workplaces, emp]);
                        }
                      }}
                      placeholder="Search to add another job..."
                    />
                    <button
                      type="button"
                      onClick={() => setWorkplaces([...workplaces, { name: '', place_id: null, address: null }])}
                      style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      + Add job
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Bio */}
          <div className="edit-profile-field">
            <label className="edit-profile-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bio <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>(optional)</span></span>
              <span style={{ fontSize: 12, color: bio.length >= 130 ? '#EF4444' : 'var(--text-muted)', fontWeight: 500 }}>{bio.length}/150</span>
            </label>
            <textarea
              className="form-input"
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 150))}
              placeholder="Tell people a little about yourself..."
              rows={3}
              maxLength={150}
              style={{ resize: 'none' }}
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="btn btn-primary btn-full edit-profile-save"
            disabled={saving || !!usernameError}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {cropRawUrl && (
        <CropModal
          rawDataUrl={cropRawUrl}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropRawUrl(null)}
        />
      )}
    </>
  );
}
