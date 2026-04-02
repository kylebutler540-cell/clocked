import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationModal from '../components/LocationModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const GOOGLE_CLIENT_ID = '65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com';
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

// ─── Shared back / forward arrows ────────────────────────────────────────────
function BackButton({ onBack }) {
  return (
    <button
      onClick={onBack}
      style={{
        position: 'absolute', top: 20, left: 20,
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: '50%',
        color: '#555',
      }}
      aria-label="Go back"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
  );
}

function ForwardButton({ onForward }) {
  return (
    <button
      onClick={onForward}
      style={{
        position: 'absolute', top: 20, right: 20,
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: '50%',
        color: '#555',
      }}
      aria-label="Go forward"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

// ─── Default avatar (Instagram-style) ────────────────────────────────────────
function DefaultAvatar({ size = 96 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#E8E8E8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill="#ABABAB"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#ABABAB"/>
      </svg>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Create an Anonymous Account',
    desc: 'Choose your own username and stay anonymous while sharing and viewing real workplace experiences.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    title: 'Real Worker Reviews',
    desc: "Unfiltered truth about what it's actually like to work somewhere.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    title: 'Search Any Employer',
    desc: "Look up any company before you apply. Know what you're walking into.",
  },
];

// ─── Screen components (top-level = stable identity, no focus loss on re-render) ─

function WelcomeScreen({ onNext }) {
  return (
    <div className="onboarding-root">
      <div className="onboarding-screen">
        <div className="onboarding-logo-wrap">
          <div className="onboarding-logo-icon">c</div>
        </div>
        <div className="onboarding-wordmark">clocked</div>
        <p className="onboarding-tagline">The app built for workers, by workers.</p>
        <p className="onboarding-body">
          Find out what it's <em>really</em> like to work somewhere before you take the job.
          Real reviews from real people — completely anonymous.
        </p>
        <div className="onboarding-actions">
          <button className="btn btn-primary btn-full onboarding-btn" onClick={onNext}>
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

function FeaturesScreen({ onNext, onBack, onForward }) {
  return (
    <div className="onboarding-root">
      <div className="onboarding-screen" style={{ position: 'relative' }}>
        <BackButton onBack={onBack} />
        {onForward && <ForwardButton onForward={onForward} />}
        <h2 className="onboarding-features-title">Why Clocked?</h2>
        <div className="onboarding-features">
          {FEATURES.map((f, i) => (
            <div key={i} className="onboarding-feature-card">
              <div className="onboarding-feature-icon">{f.icon}</div>
              <div>
                <div className="onboarding-feature-name">{f.title}</div>
                <div className="onboarding-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="btn btn-primary btn-full onboarding-btn" onClick={onNext}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// onSuccess(hasProfile) — true = skip setup, go home; false = needs profile setup
function SignupScreen({ onSuccess, onGuest, onBack, onForward, email, setEmail, password, setPassword }) {
  const { register, login, loginWithGoogle } = useAuth();
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  // 'signup' | 'login' | 'google-only' — flips when existing email detected
  const [mode, setMode] = useState('signup');

  // Check email on blur — flip to login/google-only mode if email already exists
  async function handleEmailBlur() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    if (mode === 'login' || mode === 'google-only') return; // already detected
    setCheckingEmail(true);
    try {
      const res = await api.post('/auth/check-email', { email: trimmed });
      if (res.data.exists) {
        if (res.data.googleOnly) {
          setMode('google-only');
        } else {
          setMode('login');
        }
      }
    } catch {
      // silent
    } finally {
      setCheckingEmail(false);
    }
  }

  useEffect(() => {
    const init = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const data = await loginWithGoogle(response.credential);
            onSuccess(!!data.user?.username);
          } catch {
            addToast('Google sign-in failed');
          }
        },
      });
      window.google?.accounts.id.renderButton(
        document.getElementById('onboarding-google-btn'),
        { theme: 'outline', size: 'large', width: '100%', text: 'continue_with', shape: 'pill' }
      );
    };
    if (window.google) { init(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return addToast('Email and password required');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        // Existing account — sign them in
        const data = await login(email, password);
        onSuccess(!!data.user?.username); // true = has profile, skip setup
      } else {
        if (password.length < 8) { setSubmitting(false); return addToast('Password must be at least 8 characters'); }
        const data = await register(email, password);
        onSuccess(false); // new account — needs profile setup
      }
    } catch (err) {
      if (mode === 'signup' && err.response?.status === 409) {
        setMode('login');
      } else if (err.response?.data?.googleOnly) {
        setMode('google-only');
      } else {
        addToast(err.response?.data?.error || (mode === 'login' ? 'Incorrect password' : 'Failed to create account'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === 'login';
  const isGoogleOnly = mode === 'google-only';

  return (
    <div className="onboarding-root">
      <div className="onboarding-screen" style={{ maxWidth: 480, position: 'relative' }}>
        <BackButton onBack={() => { setMode('signup'); onBack(); }} />
        {onForward && <ForwardButton onForward={onForward} />}

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: (isLogin || isGoogleOnly) ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
          color: (isLogin || isGoogleOnly) ? '#16A34A' : '#A855F7',
          fontSize: 13, fontWeight: 700, padding: '5px 14px',
          borderRadius: 20, marginBottom: 20,
        }}>
          {(isLogin || isGoogleOnly) ? '👋 Welcome back!' : '🎉 You\'re one of the first Clocked users'}
        </div>

        <h2 style={{ fontSize: 30, fontWeight: 800, color: '#111', marginBottom: 10, lineHeight: 1.2 }}>
          {(isLogin || isGoogleOnly) ? 'Sign back in' : 'Create your free account'}
        </h2>
        <p style={{ fontSize: 16, color: '#555', marginBottom: 32, maxWidth: 360, lineHeight: 1.6 }}>
          {isGoogleOnly
            ? 'This account was created with Google. Use the button below to sign in.'
            : isLogin
              ? 'Looks like you already have a Clocked account. Enter your password to continue.'
              : 'Sign up to post reviews, like, comment, and get the full Clocked experience — completely free.'}
        </p>

        {/* Google-only mode: just show Google button prominently */}
        {isGoogleOnly ? (
          <>
            <div id="onboarding-google-btn" style={{ width: '100%', maxWidth: 400, marginBottom: 16 }} />
            <button
              className="btn btn-ghost btn-full"
              style={{ maxWidth: 400, fontSize: 14 }}
              onClick={() => setMode('signup')}
            >
              Not you? Use a different email
            </button>
          </>
        ) : (
          <>
            {/* Show Google on signup mode only */}
            {!isLogin && (
              <>
                <div id="onboarding-google-btn" style={{ width: '100%', maxWidth: 400, marginBottom: 20 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 400, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
                  <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>or sign up with email</span>
                  <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400 }}>
              <div className="form-group">
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (mode !== 'signup') setMode('signup'); }}
                  onBlur={handleEmailBlur}
                  placeholder="Email address"
                  autoComplete="email"
                  required
                  style={checkingEmail ? { borderColor: '#A855F7' } : undefined}
                />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isLogin ? 'Your password' : 'Password (min 8 characters)'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  minLength={isLogin ? 1 : 8}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitting}
                style={{ marginTop: 16, fontSize: 16, padding: '14px 0' }}
              >
                {submitting
                  ? (isLogin ? 'Signing in...' : 'Creating account...')
                  : (isLogin ? 'Sign In' : 'Create Free Account')}
              </button>
            </form>

            {!isLogin && (
              <button
                className="btn btn-ghost btn-full"
                style={{ marginTop: 10, maxWidth: 400, fontSize: 14 }}
                onClick={() => setMode('login')}
              >
                Already have an account? Sign in
              </button>
            )}
            {isLogin && (
              <button
                className="btn btn-ghost btn-full"
                style={{ marginTop: 10, maxWidth: 400, fontSize: 14 }}
                onClick={() => setMode('signup')}
              >
                Not you? Use a different email
              </button>
            )}
          </>
        )}

        <button
          onClick={onGuest}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            marginTop: 20, fontSize: 13, color: '#aaa',
            textDecoration: 'underline', textDecorationColor: '#ddd',
          }}
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}

function ProfileSetupScreen({ onSuccess, onBack, onForward, displayName, setDisplayName, username, setUsername, avatarUrl, setAvatarUrl }) {
  const { setUser } = useAuth();
  const { addToast } = useToast();
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Only display name + username required; avatar optional
  const canContinue = displayName.trim() && username.trim() && !usernameError;

  function handleUsernameChange(e) {
    const val = e.target.value.replace(/\s/g, '');
    setUsername(val);
    if (val && !USERNAME_REGEX.test(val)) {
      setUsernameError('Letters, numbers, _ and . only (3–20 chars)');
    } else {
      setUsernameError('');
    }
  }

  function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected if cleared
    e.target.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim()) return addToast('Display name is required');
    if (!username.trim()) return addToast('Username is required');
    if (usernameError) return;

    setSaving(true);
    try {
      const payload = {
        display_name: displayName.trim(),
        username: username.trim(),
      };
      // Only send avatar_url if user uploaded one; otherwise backend keeps null (default)
      if (avatarUrl) payload.avatar_url = avatarUrl;

      const res = await api.patch('/auth/profile', payload);
      setUser(res.data.user);
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save profile';
      if (err.response?.status === 409) setUsernameError(msg);
      else addToast(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-root">
      <div className="onboarding-screen" style={{ maxWidth: 480, position: 'relative' }}>
        <BackButton onBack={onBack} />
        {onForward && <ForwardButton onForward={onForward} />}

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(168,85,247,0.1)', color: '#A855F7',
          fontSize: 13, fontWeight: 700, padding: '5px 14px',
          borderRadius: 20, marginBottom: 24,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Stay anonymous — don't use your real identity
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111', marginBottom: 8, lineHeight: 1.2 }}>
          Set up your profile
        </h2>
        <p style={{ fontSize: 15, color: '#555', marginBottom: 28, maxWidth: 360, lineHeight: 1.6 }}>
          Choose a username and display name that don't reveal who you are.
        </p>

        {/* Avatar upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Avatar preview */}
            <div
              style={{ cursor: 'pointer', width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: avatarUrl ? '2px solid #E5E5E5' : 'none' }}
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload photo"
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <DefaultAvatar size={96} />
              }
            </div>

            {/* Camera badge (always shown) */}
            <div
              style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 28, height: 28, borderRadius: '50%',
                background: '#A855F7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff', cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>

            {/* X to remove uploaded photo */}
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#333', border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                }}
                title="Remove photo"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 13 }}
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? 'Change Photo' : 'Upload Profile Photo'}
          </button>
          <p style={{ fontSize: 12, color: '#aaa', margin: 0, textAlign: 'center' }}>
            Optional · Avoid photos that could identify you
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarFile}
          />
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400 }}>
          <div className="form-group">
            <label className="form-label">Display Name <span style={{ color: '#EF4444' }}>*</span></label>
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
            <p style={{ fontSize: 12, color: '#aaa', margin: '5px 0 0' }}>
              This is the name others see. Keep it anonymous.
            </p>
          </div>

          <div className="form-group" style={{ marginTop: 18 }}>
            <label className="form-label">@Username <span style={{ color: '#EF4444' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#aaa', fontSize: 15, pointerEvents: 'none',
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
            {usernameError
              ? <p style={{ fontSize: 12, color: '#EF4444', margin: '5px 0 0' }}>{usernameError}</p>
              : <p style={{ fontSize: 12, color: '#aaa', margin: '5px 0 0' }}>Your unique handle — part of your profile URL.</p>
            }
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={saving || !canContinue}
            style={{ marginTop: 24, fontSize: 16, padding: '14px 0', opacity: canContinue ? 1 : 0.5 }}
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
          {!canContinue && (
            <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 8 }}>
              Display name and username are required
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function LocationScreen({ onDone, onBack, onForward }) {
  const [location, setLocation] = useState(() => localStorage.getItem('userLocation') || '');
  const [showModal, setShowModal] = useState(false);

  function handleLocationClose(city) {
    if (city) {
      setLocation(city);
      localStorage.setItem('userLocation', city);
    }
    setShowModal(false);
  }

  return (
    <div className="onboarding-root">
      <div className="onboarding-screen" style={{ position: 'relative' }}>
        <BackButton onBack={onBack} />
        {onForward && <ForwardButton onForward={onForward} />}

        <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 16 }}>📍</div>

        <h2 className="onboarding-offer-title">One last step</h2>
        <p className="onboarding-offer-body">
          Set your location so you can see workplace reviews from your area right away.
          {location && (
            <strong style={{ color: '#A855F7', marginTop: 8, display: 'block' }}>📍 {location}</strong>
          )}
        </p>

        <div className="onboarding-actions">
          <button
            className="btn btn-primary btn-full onboarding-btn"
            onClick={() => setShowModal(true)}
          >
            <span style={{ marginRight: 7, fontSize: 16 }}>📍</span>
            {location ? 'Change Location' : 'Set My Location'}
          </button>
          {location && (
            <button className="btn btn-primary btn-full onboarding-btn" onClick={onDone}>
              Enter Clocked →
            </button>
          )}
        </div>

        <p style={{ fontSize: 12, color: '#aaa', marginTop: 16 }}>
          You can change your location anytime from the home screen.
        </p>

        {showModal && <LocationModal onClose={handleLocationClose} />}
      </div>
    </div>
  );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export default function Onboarding({ onDone }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);    // current step
  const [maxStep, setMaxStep] = useState(0); // furthest step reached

  // ── Persistent form state — survives back/forward navigation ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  function goTo(n) {
    setStep(n);
    if (n > maxStep) setMaxStep(n);
  }

  function finish() {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onDone();
    navigate('/');
  }

  // Forward arrow only shown when user has been to a higher step
  const fwd = (target) => maxStep >= target ? () => goTo(target) : undefined;

  if (step === 0) return <WelcomeScreen onNext={() => goTo(1)} />;

  if (step === 1) return (
    <FeaturesScreen
      onNext={() => goTo(2)} onBack={() => goTo(0)}
      onForward={fwd(2)}
    />
  );

  if (step === 2) return (
    <SignupScreen
      onBack={() => goTo(1)}
      onForward={fwd(3)}
      onSuccess={(hasProfile) => {
        if (hasProfile) {
          // Returning user with full profile — skip setup, go straight to app
          localStorage.setItem('hasSeenOnboarding', 'true');
          onDone();
          navigate('/');
        } else {
          goTo(3);
        }
      }}
      onGuest={() => {
        localStorage.setItem('hasSeenOnboarding', 'true');
        onDone();
        navigate('/');
      }}
      email={email} setEmail={setEmail}
      password={password} setPassword={setPassword}
    />
  );

  if (step === 3) return (
    <ProfileSetupScreen
      onSuccess={() => goTo(4)}
      onBack={() => goTo(2)}
      onForward={fwd(4)}
      displayName={displayName} setDisplayName={setDisplayName}
      username={username} setUsername={setUsername}
      avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl}
    />
  );

  return <LocationScreen onDone={finish} onBack={() => goTo(3)} />;
}
