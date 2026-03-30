import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import EmployerSearch from '../components/EmployerSearch';
import RatingSelector from '../components/RatingSelector';
import { useToast } from '../context/ToastContext';
import { clearFeedCache } from '../components/Feed';

export default function Create() {
  const routeLocation = useLocation();
  const [employer, setEmployer] = useState(routeLocation.state?.employer || null);
  const [rating, setRating] = useState('');
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();
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
    if (body.trim().length > 0 && body.trim().length < 10) return addToast('Review must be at least 10 characters');
    if (body.trim().length === 0 && mediaFiles.length === 0) return addToast('Add a photo or write something');

    setSubmitting(true);
    try {
      // For MVP, media_urls would come from an upload service
      // Here we submit data URIs as placeholders (real app would use S3/Cloudinary)
      const media_urls = mediaPreviews.slice(0, 10);

      const res = await api.post('/posts', {
        employer_place_id: employer.place_id,
        employer_name: employer.name,
        employer_address: employer.address || employer.description || '',
        rating_emoji: rating,
        header: header.trim() || undefined,
        body: body.trim(),
        media_urls,
      });

      addToast('Review posted!');
      clearFeedCache();
      navigate('/');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to post review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-page">
      <h1>Share Your Experience</h1>

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
          <label className="form-label">Headline (optional)</label>
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
          <label className="form-label">Review *</label>
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
          <span>Your review is completely anonymous. No account required.</span>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting || !employer || !rating || (body.trim().length > 0 && body.trim().length < 10) || (body.trim().length === 0 && mediaFiles.length === 0)}
        >
          {submitting ? 'Posting...' : 'Post Anonymously'}
        </button>
      </form>
    </div>
  );
}
