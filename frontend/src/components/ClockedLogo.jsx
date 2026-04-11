import React from 'react';

/**
 * Clocked wordmark logo — actual logo JPG with mix-blend-mode:screen.
 * Screen blend makes the black background transparent on any bg color.
 * Purple text shows correctly on both light and dark mode.
 */
export default function ClockedLogo({ height = 44, style = {}, onClick }) {
  // 1060x400 aspect ratio = 2.65:1
  const width = Math.round(height * 2.65);

  return (
    <img
      src="/logo-text.jpg"
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
        // screen blend: black → transparent, purple stays vibrant
        mixBlendMode: 'screen',
        ...style,
      }}
      onClick={onClick}
    />
  );
}
