import React from 'react';

/**
 * Clocked wordmark logo as an image — not selectable, not highlightable.
 * Uses the exported PNG of the bold "clocked" + swoosh SVG.
 */
export default function ClockedLogo({ height = 32, style = {}, onClick }) {
  // Maintain 3.6:1 aspect ratio
  const width = Math.round(height * 3.6);
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
        pointerEvents: onClick ? 'auto' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onClick={onClick}
    />
  );
}
