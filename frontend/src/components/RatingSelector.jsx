import React from 'react';

const OPTIONS = [
  { value: 'BAD', emoji: '😡', label: 'Bad', color: '#EF4444', tint: 'rgba(239,68,68,0.15)', border: '#EF4444' },
  { value: 'NEUTRAL', emoji: '😐', label: 'Neutral', color: '#EAB308', tint: 'rgba(234,179,8,0.15)', border: '#EAB308' },
  { value: 'GOOD', emoji: '😊', label: 'Good', color: '#22C55E', tint: 'rgba(34,197,94,0.15)', border: '#22C55E', greenFilter: true },
];

export default function RatingSelector({ value, onChange }) {
  return (
    <div className="rating-selector">
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
            <span className="emoji" style={opt.greenFilter ? { filter: 'hue-rotate(85deg) saturate(1.4) brightness(1.1)' } : {}}>{opt.emoji}</span>
            <span className="label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
