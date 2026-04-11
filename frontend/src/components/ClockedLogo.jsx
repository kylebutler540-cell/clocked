import React from 'react';

/**
 * Clocked wordmark logo.
 * Uses the actual logo image file with mix-blend-mode: screen in light mode
 * so the black background becomes transparent, showing only the purple text.
 * In dark mode, shows the image as-is (black bg = invisible on dark).
 */
export default function ClockedLogo({ height = 32, style = {}, onClick }) {
  const width = Math.round(height * 3.6);

  return (
    <img
      src="/clocked-logo.jpg"
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
        // screen blend: black becomes transparent on any background
        // purple stays vibrant on both light and dark
        mixBlendMode: 'screen',
        ...style,
      }}
      onClick={onClick}
    />
  );
}
