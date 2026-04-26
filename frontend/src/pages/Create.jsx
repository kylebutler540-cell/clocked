import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import EmployerSearch from '../components/EmployerSearch';
import BusinessLogo from '../components/BusinessLogo';
import RatingSelector from '../components/RatingSelector';
import { useToast } from '../context/ToastContext';
import { clearFeedCache } from '../components/Feed';
import { useAuth } from '../context/AuthContext';

const DRAFT_KEY = 'clocked_create_draft';
function saveDraft(d) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {} }
function loadDraft() { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } }
function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch {} }

export default function Create() {
  const routeLocation = useLocation();
  const editPost = routeLocation.state?.editPost || null;
  const isEditMode = !!editPost;

  // Restore draft for new posts only — edit mode always uses the post data
  const _draft = !isEditMode ? (loadDraft() || {}) : {};

  const [employer, setEmployerRaw] = useState(() => {
    if (isEditMode) return { place_id: editPost.employer_place_id, name: editPost.employer_name, address: editPost.employer_address };
    if (routeLocation.state?.employer) return routeLocation.state.employer;
    return _draft.employer || null;
  });
  const [rating, setRatingRaw] = useState(() => isEditMode ? (editPost?.rating_emoji || '') : (_draft.rating || ''));
  const [header, setHeaderRaw] = useState(() => isEditMode ? (editPost?.header || '') : (_draft.header || ''));
  const [body, setBodyRaw] = useState(() => isEditMode ? (editPost?.body || '') : (_draft.body || ''));
  const [submitting, setSubmitting] = useState(false);
  const [truthAgreed, setTruthAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const employerRef = useRef(null);
  const ratingRef = useRef(null);
  const headerRef = useRef(null);
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Setters that auto-save draft (new posts only)
  function setEmployer(v) { setEmployerRaw(v); if (!isEditMode) saveDraft({ employer: v, rating, header, body }); }
  function setRating(v) { setRatingRaw(v); if (!isEditMode) saveDraft({ employer, rating: v, header, body }); }
  function setHeader(v) { setHeaderRaw(v); if (!isEditMode) saveDraft({ employer, rating, header: v, body }); }
  function setBody(v) { setBodyRaw(v); if (!isEditMode) saveDraft({ employer, rating, header, body: v }); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!employer) return addToast('Please select an employer');
    if (!rating) return addToast('Please choose a rating');
    if (!header.trim()) return addToast('Please add a headline');
    if (!pollEnabled && body.trim().length > 0 && body.trim().length < 10) return addToast('Review must be at least 10 characters');

    if (pollEnabled) {
      if (!pollQuestion.trim()) return addToast('Please add a poll question');
      const filledOptions = pollOptions.filter(o => o.trim());
      if (filledOptions.length < 2) return addToast('Poll needs at least 2 options');
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await api.put(`/posts/${editPost.id}`, {
          employer_place_id: employer.place_id,
          employer_name: employer.name,
          employer_address: employer.address || employer.description || '',
          rating_emoji: rating,
          header: header.trim(),
          body: body.trim(),
        });
        addToast('Changes saved!');
        clearFeedCache();
        navigate(-1);
      } else {
        const payload = {
          employer_place_id: employer.place_id,
          employer_name: employer.name,
          employer_address: employer.address || employer.description || '',
          rating_emoji: rating,
          header: header.trim(),
          body: body.trim(),
        };
        if (pollEnabled) {
          payload.poll = {
            question: pollQuestion.trim(),
            options: pollOptions.filter(o => o.trim()).map(o => o.trim()),
          };
        }
        await api.post('/posts', payload);
        addToast('Review posted!');
        clearDraft();
        clearFeedCache();
        navigate('/');
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  function addPollOption() {
    if (pollOptions.length < 10) setPollOptions(prev => [...prev, '']);
  }

  function removePollOption(idx) {
    if (pollOptions.length <= 2) return;
    setPollOptions(prev => prev.filter((_, i) => i !== idx));
  }

  function setPollOption(idx, val) {
    setPollOptions(prev => prev.map((o, i) => i === idx ? val : o));
  }

  function removePoll() {
    setPollEnabled(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  }

  if (!user?.email) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px 24px', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 100 100" style={{ marginBottom: 20 }}>
          <rect width="100" height="100" rx="20" fill="rgba(168,85,247,0.12)" />
          <text x="50" y="68" fontFamily="system-ui, sans-serif" fontSize="42" fontWeight="700" fill="#A855F7" textAnchor="middle">c</text>
        </svg>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Sign in to post</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28, maxWidth: 320 }}>
          Create an account to share your workplace experience anonymously.
        </p>
        <button
          className="btn btn-primary"
          style={{ padding: '11px 32px', fontSize: 15, fontWeight: 700 }}
          onClick={() => navigate('/signup')}
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="create-page">
      <h1>{isEditMode ? 'Edit Your Review' : 'Share Your Experience'}</h1>

      <form onSubmit={handleSubmit}>
        {/* Employer */}
        <div className="form-group" ref={employerRef}>
          <label className="form-label" style={{ color: fieldErrors.employer ? '#EF4444' : undefined }}>
            Employer *{fieldErrors.employer && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>(required)</span>}
          </label>
          {employer ? (
            <div className="employer-selected">
              {employer.place_id && (
                <BusinessLogo placeId={employer.place_id} name={employer.name} size={36} borderRadius={8} />
              )}
              <div className="employer-selected-info">
                <div className="employer-selected-name">{employer.name}</div>
                <div className="employer-selected-address">{employer.address || employer.description}</div>
              </div>
              <button
                type="button"
                className="employer-clear-btn"
                onClick={() => setEmployer(null)}
              >
                ×
              </button>
            </div>
          ) : (
            <EmployerSearch
              onSelect={emp => { setEmployer(emp); setFieldErrors(prev => ({ ...prev, employer: undefined })); }}
              placeholder="Search for your employer..."
            />
          )}
        </div>

        {/* Rating */}
        <div className="form-group" ref={ratingRef}>
          <label className="form-label" style={{ color: fieldErrors.rating ? '#EF4444' : undefined }}>
            Overall Rating *{fieldErrors.rating && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>(required)</span>}
          </label>
          <RatingSelector value={rating} onChange={v => { setRating(v); setFieldErrors(prev => ({ ...prev, rating: undefined })); }} />
        </div>

        {/* Header */}
        <div className="form-group" ref={headerRef}>
          <label className="form-label" style={{ color: fieldErrors.header ? '#EF4444' : undefined }}>
            Headline *{fieldErrors.header && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>(required)</span>}
          </label>
          <input
            className="form-input"
            type="text"
            value={header}
            onChange={e => { setHeader(e.target.value); if (e.target.value.trim()) setFieldErrors(prev => ({ ...prev, header: undefined })); }}
            placeholder="Summarize your experience..."
            maxLength={120}
          />
        </div>

        {/* Body */}
        <div className="form-group">
          <label className="form-label">Review <span style={{color:'var(--text-muted)',fontWeight:400,fontSize:12}}>(optional)</span></label>
          <textarea
            className="form-input"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Tell other workers what it's really like — pay, management, culture, hours, safety..."
            rows={6}
            maxLength={5000}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', resize: 'vertical', touchAction: 'auto', userSelect: 'text', WebkitUserSelect: 'text' }}
          />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
            {body.length}/5000
          </div>
        </div>

        {/* Poll composer */}
        {!isEditMode && (
          pollEnabled ? (
            <div className="poll-add-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Poll</span>
                <button type="button" onClick={removePoll} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove Poll</button>
              </div>
              <input
                className="form-input"
                type="text"
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                maxLength={200}
                style={{ marginBottom: 8 }}
              />
              {pollOptions.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    className="form-input"
                    type="text"
                    value={opt}
                    onChange={e => setPollOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    maxLength={80}
                    style={{ flex: 1 }}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePollOption(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: '0 4px', flexShrink: 0 }}
                      aria-label="Remove option"
                    >×</button>
                  )}
                </div>
              ))}
              {pollOptions.length < 10 && (
                <button
                  type="button"
                  onClick={addPollOption}
                  style={{ fontSize: 13, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontWeight: 600 }}
                >
                  + Add option
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPollEnabled(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: 'var(--purple)', fontWeight: 600,
                background: 'none', border: '1.5px dashed var(--purple)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                cursor: 'pointer', width: '100%', marginBottom: 12,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Poll
            </button>
          )
        )}

        {/* Anonymous notice */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '12px 14px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 12,
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          <span style={{ fontSize: 16 }}>🛡️</span>
          <span>Your review is completely anonymous.</span>
        </div>

        {/* Truthfulness acknowledgment — required for new posts */}
        {!isEditMode && (
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={truthAgreed}
              onChange={e => setTruthAgreed(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#A855F7', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              I confirm this review is based on my real, firsthand experience and does not contain false or defamatory statements.
            </span>
          </label>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting || (!isEditMode && !truthAgreed)}
        >
          {submitting ? (isEditMode ? 'Saving...' : 'Posting...') : (isEditMode ? 'Save Changes' : 'Post Anonymously')}
        </button>
      </form>
    </div>
  );
}
