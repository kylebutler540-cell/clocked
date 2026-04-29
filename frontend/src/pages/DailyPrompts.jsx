import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { key: 'general',    label: 'General',              emoji: '🌐' },
  { key: 'restaurant', label: 'Food & Restaurant',    emoji: '🍽️' },
  { key: 'retail',     label: 'Retail & Sales',       emoji: '🛒' },
  { key: 'hvac',       label: 'Trades & HVAC',        emoji: '🔧' },
  { key: 'office',     label: 'Office & Corporate',   emoji: '💼' },
  { key: 'warehouse',  label: 'Warehouse & Logistics',emoji: '📦' },
  { key: 'healthcare', label: 'Healthcare',           emoji: '🏥' },
];

const CATEGORY_COLORS = {
  management: '#8B5CF6',
  workload:   '#F59E0B',
  customers:  '#3B82F6',
  pay:        '#10B981',
  stress:     '#EF4444',
  culture:    '#EC4899',
  teamwork:   '#06B6D4',
};

const CATEGORY_LABELS = {
  management: 'Management',
  workload:   'Workload',
  customers:  'Customers',
  pay:        'Pay & Worth',
  stress:     'Stress',
  culture:    'Culture',
  teamwork:   'Teamwork',
};

const SLIDER_OPTIONS = [
  { value: '1', emoji: '😡', label: 'Very Bad' },
  { value: '2', emoji: '😕', label: 'Bad' },
  { value: '3', emoji: '😐', label: 'Okay' },
  { value: '4', emoji: '🙂', label: 'Good' },
  { value: '5', emoji: '😄', label: 'Great' },
];

function getIndustry() {
  return localStorage.getItem('clocked_industry') || null;
}
function setIndustry(ind) {
  localStorage.setItem('clocked_industry', ind);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// ── Industry Picker ────────────────────────────────────────────────────────────

function IndustryPicker({ onSelect, current }) {
  return (
    <div className="dp-industry-picker">
      <div className="dp-industry-title">What type of work do you do?</div>
      <div className="dp-industry-subtitle">We'll personalize each daily prompt for your workplace.</div>
      <div className="dp-industry-grid">
        {INDUSTRIES.map(ind => (
          <button
            key={ind.key}
            className={`dp-industry-btn${current === ind.key ? ' dp-industry-btn-selected' : ''}`}
            onClick={() => onSelect(ind.key)}
          >
            <span className="dp-industry-emoji">{ind.emoji}</span>
            <span className="dp-industry-label">{ind.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Results Bar ────────────────────────────────────────────────────────────────

function ResultBar({ label, pct, count, isSelected, color }) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className={`dp-result-row${isSelected ? ' dp-result-row-selected' : ''}`}>
      <div className="dp-result-label">
        {isSelected && <span className="dp-result-check">✓</span>}
        <span>{label}</span>
      </div>
      <div className="dp-result-bar-wrap">
        <div
          className="dp-result-bar-fill"
          style={{ width: `${animPct}%`, background: isSelected ? color || 'var(--purple)' : color ? `${color}30` : 'var(--bg-elevated)' }}
        />
        <span className="dp-result-pct">{pct}%</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DailyPrompts() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [industry, setIndustryState] = useState(getIndustry);
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [firstVisit, setFirstVisit] = useState(!getIndustry());

  const [loading, setLoading] = useState(true);
  const [promptData, setPromptData] = useState(null);
  const [error, setError] = useState(null);

  // Local response selection (before submitting)
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);

  const fetchPrompt = useCallback(async (ind) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/daily-prompts/today', { params: { industry: ind || 'general' } });
      setPromptData(res.data);
      if (res.data.userResponse) setSelected(res.data.userResponse);
    } catch {
      setError('Could not load today\'s prompt. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!firstVisit) fetchPrompt(industry);
  }, [industry, firstVisit, fetchPrompt]);

  function handleIndustrySelect(ind) {
    setIndustry(ind);
    setIndustryState(ind);
    setFirstVisit(false);
    setShowIndustryPicker(false);
  }

  async function handleSubmit() {
    if (!selected) return;
    if (!user?.email) { navigate('/signup'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/daily-prompts/today/respond', {
        value: selected,
        industry: industry || 'general',
      });
      setPromptData(prev => ({
        ...prev,
        userResponse: res.data.userResponse,
        results: res.data.results,
        totalResponses: res.data.totalResponses,
        streak: res.data.streak,
      }));
      navigate('/daily-prompts/feed');
    } catch {
      // fail silently — keep selection shown
    } finally {
      setSubmitting(false);
    }
  }

  // ── First visit: industry picker ─────────────────────────────────────────────
  if (firstVisit) {
    return (
      <div className="dp-page">
        <div className="dp-header-row">
          <div>
            <div className="dp-title">Daily Prompts</div>
            <div className="dp-subtitle">One honest question. Every day.</div>
          </div>
          <div className="dp-bolt-icon">⚡</div>
        </div>
        <IndustryPicker onSelect={handleIndustrySelect} current={industry} />
      </div>
    );
  }

  const catColor = promptData ? CATEGORY_COLORS[promptData.category] || 'var(--purple)' : 'var(--purple)';
  const hasResponded = !!promptData?.userResponse;
  // User voted today but under a DIFFERENT occupation — lock this tab to results-only
  const votedElsewhere = promptData?.hasVotedToday && !hasResponded;
  const votedOccupationLabel = votedElsewhere
    ? (INDUSTRIES.find(i => i.key === promptData.votedOccupation)?.label || promptData.votedOccupation)
    : null;
  const industryObj = INDUSTRIES.find(i => i.key === industry) || INDUSTRIES[0];

  return (
    <div className="dp-page">
      {/* Header */}
      <div className="dp-header-row">
        <div>
          <div className="dp-title">Daily Prompts</div>
          {promptData && <div className="dp-date">{formatDate(promptData.date)}</div>}
        </div>
        {/* Streak */}
        {promptData?.streak > 0 && (
          <div className="dp-streak">
            <span className="dp-streak-fire">🔥</span>
            <span className="dp-streak-count">{promptData.streak}</span>
            <span className="dp-streak-label">{promptData.streak === 1 ? 'day' : 'days'}</span>
          </div>
        )}
      </div>

      {/* Industry chip */}
      <button
        className="dp-industry-chip"
        onClick={() => setShowIndustryPicker(v => !v)}
      >
        <span>{industryObj.emoji}</span>
        <span>{industryObj.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Industry picker dropdown */}
      {showIndustryPicker && (
        <div className="dp-industry-dropdown">
          {INDUSTRIES.map(ind => (
            <button
              key={ind.key}
              className={`dp-industry-dropdown-item${industry === ind.key ? ' active' : ''}`}
              onClick={() => {
                setIndustry(ind.key);
                setIndustryState(ind.key);
                setShowIndustryPicker(false);
                setSelected(null);
                setJustAnswered(false);
                fetchPrompt(ind.key);
              }}
            >
              <span>{ind.emoji}</span>
              <span>{ind.label}</span>
              {industry === ind.key && <span style={{ marginLeft: 'auto', color: 'var(--purple)' }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* Main prompt card */}
      {loading ? (
        <div className="dp-loading">
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="dp-error">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => fetchPrompt(industry)}>Try Again</button>
        </div>
      ) : promptData ? (
        <div className="dp-card">
          {/* Category badge */}
          <div className="dp-category-badge" style={{ background: `${catColor}18`, color: catColor, borderColor: `${catColor}30` }}>
            {CATEGORY_LABELS[promptData.category] || promptData.category}
          </div>

          {/* Hook + question */}
          <div className="dp-hook">{promptData.hook}</div>
          <div className="dp-question">{promptData.question}</div>

          {/* Response area */}
          {votedElsewhere ? (
            /* Locked — already voted in a different occupation */
            <div className="dp-voted-elsewhere">
              <div className="dp-voted-elsewhere-icon">🔒</div>
              <div className="dp-voted-elsewhere-msg">
                You already voted today under <strong>{votedOccupationLabel}</strong>.
              </div>
              <button
                className="dp-voted-elsewhere-btn"
                onClick={() => navigate('/daily-prompts/feed')}
              >
                See the feed →
              </button>
            </div>
          ) : !hasResponded ? (
            <>
              {/* Yes / No */}
              {promptData.responseType === 'yesno' && (
                <div className="dp-yesno">
                  <button
                    className={`dp-yesno-btn dp-yesno-yes${selected === 'yes' ? ' dp-yesno-selected' : ''}`}
                    onClick={() => setSelected('yes')}
                  >
                    <span className="dp-yesno-emoji">👍</span>
                    <span>Yes</span>
                  </button>
                  <button
                    className={`dp-yesno-btn dp-yesno-no${selected === 'no' ? ' dp-yesno-selected' : ''}`}
                    onClick={() => setSelected('no')}
                  >
                    <span className="dp-yesno-emoji">👎</span>
                    <span>No</span>
                  </button>
                </div>
              )}

              {/* Emoji Slider */}
              {promptData.responseType === 'slider' && (
                <div className="dp-slider">
                  {SLIDER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`dp-slider-opt${selected === opt.value ? ' dp-slider-opt-selected' : ''}`}
                      onClick={() => setSelected(v => v === opt.value ? null : opt.value)}
                      data-rating={opt.value}
                      title={opt.label}
                    >
                      <span className="dp-slider-emoji">{opt.emoji}</span>
                      {selected === opt.value && (
                        <span className="dp-slider-label">{opt.label}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Poll */}
              {promptData.responseType === 'poll' && promptData.pollOptions && (
                <div className="dp-poll">
                  {promptData.pollOptions.map(opt => (
                    <button
                      key={opt}
                      className={`dp-poll-opt${selected === opt ? ' dp-poll-opt-selected' : ''}`}
                      onClick={() => setSelected(v => v === opt ? null : opt)}
                    >
                      <span className={`dp-poll-radio${selected === opt ? ' dp-poll-radio-selected' : ''}`} />
                      <span className="dp-poll-text">{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Submit button */}
              {selected && (
                <button
                  className="dp-submit-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ background: catColor }}
                >
                  {submitting ? 'Submitting…' : 'Submit Answer'}
                </button>
              )}

              {!user?.email && (
                <p className="dp-signin-hint">
                  <button onClick={() => navigate('/signup')} style={{ color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    Sign in
                  </button>
                  {' '}to answer and see how others responded.
                </p>
              )}
            </>
          ) : (
            /* Results */
            <>
              {justAnswered && (
                <div className="dp-answered-badge">
                  ✓ Answer recorded
                </div>
              )}

              <div className="dp-results">
                <div className="dp-results-total">
                  {promptData.totalResponses} {promptData.totalResponses === 1 ? 'person' : 'people'} answered today
                </div>

                {promptData.responseType === 'yesno' && promptData.results && (
                  <>
                    <ResultBar label="Yes" pct={promptData.results.yes?.pct || 0} count={promptData.results.yes?.count || 0} isSelected={promptData.userResponse === 'yes'} color="#22C55E" />
                    <ResultBar label="No"  pct={promptData.results.no?.pct  || 0} count={promptData.results.no?.count  || 0} isSelected={promptData.userResponse === 'no'}  color="#EF4444" />
                  </>
                )}

                {promptData.responseType === 'slider' && promptData.results && (
                  <div className="dp-slider-results">
                    {SLIDER_OPTIONS.map(opt => (
                      <ResultBar
                        key={opt.value}
                        label={`${opt.emoji} ${opt.label}`}
                        pct={promptData.results[opt.value]?.pct || 0}
                        count={promptData.results[opt.value]?.count || 0}
                        isSelected={promptData.userResponse === opt.value}
                        color={catColor}
                      />
                    ))}
                  </div>
                )}

                {promptData.responseType === 'poll' && promptData.results && promptData.pollOptions && (
                  <>
                    {promptData.pollOptions.map(opt => (
                      <ResultBar
                        key={opt}
                        label={opt}
                        pct={promptData.results[opt]?.pct || 0}
                        count={promptData.results[opt]?.count || 0}
                        isSelected={promptData.userResponse === opt}
                        color={catColor}
                      />
                    ))}
                  </>
                )}

                <button
                  className="dp-change-btn"
                  onClick={() => {
                    setSelected(promptData.userResponse);
                    setPromptData(prev => ({ ...prev, userResponse: null }));
                    setJustAnswered(false);
                  }}
                >
                  Change my answer
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Info footer */}
      <div className="dp-footer">
        <div className="dp-footer-icon">⚡</div>
        <div className="dp-footer-text">
          New prompt every day. Answer to see how everyone else responded.
        </div>
      </div>
    </div>
  );
}
