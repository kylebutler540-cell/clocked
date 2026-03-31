import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function StarRating({ placeId }) {
  const [rating, setRating] = useState(0);
  const [average, setAverage] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/ratings/${placeId}`)
      .then(res => {
        setRating(res.data.userRating || 0);
        setAverage(res.data.averageRating || 0);
        setTotalRatings(res.data.totalRatings || 0);
      })
      .catch(() => {});
  }, [placeId]);

  async function handleRate(star) {
    if (saving) return;
    const prevRating = rating;
    const prevAverage = average;
    const prevTotal = totalRatings;
    setRating(star);
    const newTotal = prevRating === 0 ? prevTotal + 1 : prevTotal;
    const newAverage = prevRating === 0
      ? (prevAverage * prevTotal + star) / newTotal
      : (prevAverage * prevTotal - prevRating + star) / newTotal;
    setAverage(newAverage);
    setTotalRatings(newTotal);
    setSaving(true);
    try {
      await api.post('/ratings', { placeId, rating: star });
      const res = await api.get(`/ratings/${placeId}`);
      setAverage(res.data.averageRating || 0);
      setTotalRatings(res.data.totalRatings || 0);
    } catch {
      setRating(prevRating);
      setAverage(prevAverage);
      setTotalRatings(prevTotal);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (saving || rating === 0) return;
    const prevRating = rating;
    const prevAverage = average;
    const prevTotal = totalRatings;
    // Optimistic update
    setRating(0);
    const newTotal = prevTotal - 1;
    const newAverage = newTotal > 0 ? (prevAverage * prevTotal - prevRating) / newTotal : 0;
    setAverage(newAverage);
    setTotalRatings(newTotal);
    setSaving(true);
    try {
      const res = await api.delete(`/ratings/${placeId}`);
      setAverage(res.data.averageRating || 0);
      setTotalRatings(res.data.totalRatings || 0);
    } catch {
      setRating(prevRating);
      setAverage(prevAverage);
      setTotalRatings(prevTotal);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= (hovered || rating);
        return (
          <button
            key={star}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 1px',
              cursor: 'pointer',
              fontSize: 22,
              color: filled ? '#A855F7' : 'var(--border)',
              transition: 'none',
              lineHeight: 1,
            }}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onTouchStart={() => setHovered(star)}
            onTouchEnd={() => setHovered(0)}
            onClick={() => handleRate(star)}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            ★
          </button>
        );
      })}
      {rating > 0 && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear your rating"
          style={{
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: 6,
            padding: '2px 7px',
            fontSize: 12,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            lineHeight: 1,
            marginLeft: 4,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
      {totalRatings > 0 && (
        <span style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontWeight: 600,
          marginLeft: 4,
        }}>
          {average.toFixed(1)} ({totalRatings})
        </span>
      )}
    </div>
  );
}
