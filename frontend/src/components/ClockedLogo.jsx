import React from 'react';

/**
 * Clocked wordmark logo — actual image, not selectable.
 * Uses the logo JPG directly. On dark mode the black bg blends in naturally.
 * On light mode we use a CSS filter approach to show the purple on white.
 */
export default function ClockedLogo({ height = 40, style = {}, onClick }) {
  const width = Math.round(height * 3.6);

  return (
    <span
      style={{
        display: 'inline-block',
        width,
        height,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
      onClick={onClick}
    >
      {/* Dark mode version — natural black bg blends into dark header */}
      <img
        src="/clocked-logo.jpg"
        alt="clocked"
        width={width}
        height={height}
        draggable={false}
        style={{
          position: 'absolute', top: 0, left: 0,
          objectFit: 'contain',
          userSelect: 'none',
          display: 'block',
          // Only show in dark mode
          opacity: 'var(--logo-dark-opacity, 0)',
        }}
      />
      {/* Light mode version — invert makes white bg + purple text readable */}
      <img
        src="/clocked-logo.jpg"
        alt=""
        width={width}
        height={height}
        draggable={false}
        style={{
          position: 'absolute', top: 0, left: 0,
          objectFit: 'contain',
          userSelect: 'none',
          display: 'block',
          // invert(1) flips black→white, purple stays as its complement
          // then hue-rotate(180deg) brings purple back
          filter: 'invert(1) hue-rotate(180deg)',
          // Only show in light mode
          opacity: 'var(--logo-light-opacity, 1)',
        }}
      />
    </span>
  );
}
