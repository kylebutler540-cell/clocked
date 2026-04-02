import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import EmployerSearch from '../components/EmployerSearch';
import RatingSelector from '../components/RatingSelector';
import { useToast } from '../context/ToastContext';
import { clearFeedCache } from '../components/Feed';
import { useAuth } from '../context/AuthContext';

export default function Create() {
  const routeLocation = useLocation();
  const editPost = routeLocation.state?.editPost || null;
  const isEditMode = !!editPost;

  const [employer, setEmployer] = useState(
    editPost ? { place_id: editPost.employer_place_id, name: editPost.employer_name, address: editPost.employer_address } :
    routeLocation.state?.employer || null
  );
  const [rating, setRating] = useState(editPost?.rating_emoji || '');
  const [header, setHeader] = useState(editPost?.header || '');
  const [body, setBody] = useState(editPost?.body || '');
  const [mediaPreviews, setMediaPreviews] = useState(editPost?.media_urls || []);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleMediaChange(e) {
    addFiles(Array.from(e.target.files));
  }

  function removeMedia(index) {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function addFiles(files) {
    const valid = files.filter(f => f.type.startsWith('image/') || f.type === 'video/mp4');
    const remaining = 10 - mediaFiles.length;
    const toAdd = valid.slice(0, remaining);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setMediaPreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
    setMediaFiles(prev => [...prev, ...toAdd]);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFiles(files);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!employer) return addToast('Please select an employer');
    if (!rating) return addToast('Please choose a rating');
    if (!header.trim()) return addToast('Please add a headline');
    if (body.trim().length > 0 && body.trim().length < 10) return addToast('Review must be at least 10 characters');

    setSubmitting(true);
    try {
      const media_urls = mediaPreviews.slice(0, 10);

      if (isEditMode) {
        await api.put(`/posts/${editPost.id}`, {
          employer_place_id: employer.place_id,
          employer_name: employer.name,
          employer_address: employer.address || employer.description || '',
          rating_emoji: rating,
          header: header.trim(),
          body: body.trim(),
          media_urls,
        });
        addToast('Changes saved!');
        clearFeedCache();
        navigate(-1);
      } else {
        await api.post('/posts', {
          employer_place_id: employer.place_id,
          employer_name: employer.name,
          employer_address: employer.address || employer.description || '',
          rating_emoji: rating,
          header: header.trim(),
          body: body.trim(),
          media_urls,
        });
        addToast('Review posted!');
        clearFeedCache();
        navigate('/');
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
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
        <div className="form-group">
          <label className="form-label">Employer *</label>
          {employer ? (
            <div className="employer-selected">
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
              onSelect={setEmployer}
              placeholder="Search for your employer..."
            />
          )}
        </div>

        {/* Rating */}
        <div className="form-group">
          <label className="form-label">Overall Rating *</label>
          <RatingSelector value={rating} onChange={setRating} />
        </div>

        {/* Header */}
        <div className="form-group">
          <label className="form-label">Headline *</label>
          <input
            className="form-input"
            type="text"
            value={header}
            onChange={e => setHeader(e.target.value)}
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
          />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
            {body.length}/5000
          </div>
        </div>

        {/* Media */}
        <div className="form-group">
          <label className="form-label">Photos/Videos (up to 10)</label>

          {mediaPreviews.length > 0 && (
            <div className="media-preview-list">
              {mediaPreviews.map((preview, i) => (
                <div key={i} className="media-preview-item">
                  <img src={preview} alt={`Preview ${i + 1}`} />
                  <button
                    type="button"
                    className="media-preview-remove"
                    onClick={() => removeMedia(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {mediaFiles.length < 10 && (
            <div
              className="media-upload-area"
              style={{
                marginTop: mediaPreviews.length > 0 ? 10 : 0,
                borderColor: isDragOver ? 'var(--purple)' : undefined,
                background: isDragOver ? 'rgba(168,85,247,0.08)' : undefined,
                transform: isDragOver ? 'scale(1.01)' : undefined,
                transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="media-upload-icon">{isDragOver ? '⬇️' : '📷'}</div>
              <div className="media-upload-text">
                {isDragOver ? 'Drop to upload' : `Tap or drag to add photos/videos (${10 - mediaFiles.length} remaining)`}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4"
            multiple
            onChange={handleMediaChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Anonymous notice */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '12px 14px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 20,
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          <span style={{ fontSize: 16 }}>🛡️</span>
          <span>Your review is completely anonymous.</span>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting || !employer || !rating || !header.trim() || (body.trim().length > 0 && body.trim().length < 10)}
        >
          {submitting ? (isEditMode ? 'Saving...' : 'Posting...') : (isEditMode ? 'Save Changes' : 'Post Anonymously')}
        </button>
      </form>
    </div>
  );
}
