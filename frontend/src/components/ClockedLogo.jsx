import React from 'react';

/**
 * Clocked wordmark logo — bold "clocked" with swoosh underline.
 * Color always uses app purple #A855F7.
 * Works on both light and dark backgrounds.
 */
export default function ClockedLogo({ height = 32, style = {} }) {
  const w = height * 3.6; // maintain aspect ratio
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 360 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', ...style }}
    >
      {/* Wordmark */}
      <text
        x="4"
        y="74"
        fontFamily="'Arial Black', 'Arial Bold', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="900"
        fontSize="74"
        fill="#A855F7"
        letterSpacing="-1"
      >
        clocked
      </text>
      {/* Swoosh underline */}
      <path
        d="M4 86 Q180 100 356 86"
        stroke="#A855F7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
