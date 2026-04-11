import React from 'react';

/**
 * Clocked wordmark logo — transparent PNG, not selectable.
 * Purple text + swoosh on transparent background.
 * Works on any background, light or dark mode.
 */
export default function ClockedLogo({ height = 40, style = {}, onClick }) {
  const width = Math.round(height * 5.0); // 500/100 aspect ratio

  return (
    <img
      src="/logo-text.png"
      alt="clocked"
      width={width}
      height={height}
      draggable={false}
      style={{
        display: 'block',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: onClick ? 'pointer' : 'default',
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
      onClick={onClick}
    />
  );
}
