import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationModal from '../components/LocationModal';

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Completely Anonymous',
    desc: 'No name, no face, no trace. Your identity is never revealed.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    title: 'Real Worker Reviews',
    desc: 'Unfiltered truth about what it\'s actually like to work somewhere.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    title: 'Search Any Employer',
    desc: 'Look up any company before you apply. Know what you\'re walking into.',
  },
];

export default function Onboarding({ onDone }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = welcome, 1 = features, 2 = offer, 3 = location
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [location, setLocation] = useState(() => localStorage.getItem('userLocation') || '');

  function finish(path = '/') {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onDone();
    navigate(path);
  }

  function handleMaybeLater() {
    if (!localStorage.getItem('userLocation')) {
      setStep(3);
    } else {
      finish('/');
    }
  }

  function handleLocationClose(city) {
    if (city) {
      setLocation(city);
      localStorage.setItem('userLocation', city);
    }
    setShowLocationModal(false);
  }

  if (step === 0) {
    return (
      <div className="onboarding-screen">
        {/* Logo */}
        <div className="onboarding-logo-wrap">
          <div className="onboarding-logo-icon">c</div>
        </div>
        <div className="onboarding-wordmark">clocked</div>
        <p className="onboarding-tagline">
          The app built for workers, by workers.
        </p>
        <p className="onboarding-body">
          Find out what it's <em>really</em> like to work somewhere before you take the job.
          Real reviews from real people — completely anonymous.
        </p>
        <div className="onboarding-actions">
          <button className="btn btn-primary btn-full onboarding-btn" onClick={() => setStep(1)}>
            Get Started
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => finish('/')}>
            Browse First
          </button>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="onboarding-screen">
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
          <button className="btn btn-primary btn-full onboarding-btn" onClick={() => setStep(2)}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-offer-badge">🎉 Early Access Offer</div>
        <h2 className="onboarding-offer-title">You're one of the first.</h2>
        <p className="onboarding-offer-body">
          Clocked just launched. As one of our first users, you get <strong>50% off Pro forever</strong> — unlimited reviews, no paywall, ever.
        </p>
        <div className="onboarding-offer-card">
          <div className="onboarding-offer-price">
            <span className="onboarding-price-original">$2.99</span>
            <span className="onboarding-price-new">$1.49<span>/mo</span></span>
          </div>
          <div className="onboarding-offer-detail">Lock in your founder rate today.</div>
        </div>
        <div className="onboarding-actions">
          <button className="btn btn-primary btn-full onboarding-btn" onClick={() => finish('/signup')}>
            Create Account & Claim Offer
          </button>
          <button className="btn btn-ghost btn-full" onClick={handleMaybeLater}>
            Maybe Later
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
          No credit card required to browse. Cancel anytime.
        </p>
      </div>
    );
  }

  // Step 3 — location prompt
  return (
    <div className="onboarding-screen">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <h2 className="onboarding-offer-title">See reviews near you</h2>
      <p className="onboarding-offer-body">
        Set your location to find workplace reviews from your area.
        {location && <><br /><strong style={{ color: '#A855F7' }}>📍 {location}</strong></>}
      </p>
      <div className="onboarding-actions">
        <button
          className="btn btn-primary btn-full onboarding-btn"
          onClick={() => setShowLocationModal(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {location ? 'Change Location' : 'Set My Location'}
        </button>
        {location && (
          <button className="btn btn-primary btn-full onboarding-btn" onClick={() => finish('/')}>
            Continue
          </button>
        )}
        <button className="btn btn-ghost btn-full" onClick={() => finish('/')}>
          Skip for Now
        </button>
      </div>
      {showLocationModal && <LocationModal onClose={handleLocationClose} />}
    </div>
  );
}
