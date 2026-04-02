import React from 'react';

const OPTIONS = [
  { value: 'BAD', emoji: '😡', label: 'Bad', color: '#EF4444', tint: 'rgba(239,68,68,0.15)', border: '#EF4444' },
  { value: 'NEUTRAL', emoji: '😐', label: 'Neutral', color: '#EAB308', tint: 'rgba(234,179,8,0.15)', border: '#EAB308' },
  { value: 'GOOD', emoji: '😊', label: 'Good', color: '#22C55E', tint: 'rgba(34,197,94,0.15)', border: '#22C55E', greenFilter: true },
];

export default function RatingSelector({ value, onChange }) {
  return (
    <div className="rating-selector" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {OPTIONS.map(opt => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`rating-option ${selected ? 'selected' : ''}`}
            onClick={() => onChange(opt.value)}
            style={{
              background: selected ? opt.color : opt.tint,
              borderColor: opt.border,
              borderWidth: 2,
              borderStyle: 'solid',
            }}
          >
            <span className="emoji" style={opt.greenFilter ? { filter: 'sepia(1) saturate(4) hue-rotate(65deg) brightness(0.9)' } : {}}>{opt.emoji}</span>
            <span className="label">{opt.label}</span>
          </button>
        );
      })}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          title="Clear rating"
          style={{
            marginLeft: 2,
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: 8,
            padding: '4px 8px',
            fontSize: 13,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
