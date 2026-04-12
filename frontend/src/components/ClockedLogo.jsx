import React from 'react';

/**
 * Clocked wordmark logo — actual logo JPG, works in light + dark mode.
 * CSS handles theme switching via the data-theme attribute.
 */
export default function ClockedLogo({ height = 44, style = {}, onClick }) {
  const width = Math.round(height * 2.65);
  return (
    <img
      src="/logo-text.jpg"
      alt="clocked"
      width={width}
      height={height}
      draggable={false}
      className="clocked-logo-img"
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
