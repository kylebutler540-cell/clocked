import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ClockedLogo({ height = 44, style = {}, onClick }) {
  const { theme } = useTheme();
  const width = Math.round(height * 2.65);
  const src = theme === 'light' ? '/logo-text-light.png' : '/logo-text.jpg';
  return (
    <img src={src} alt="clocked" width={width} height={height} draggable={false}
      className="clocked-logo-img"
      style={{ display:'block', userSelect:'none', WebkitUserSelect:'none', cursor: onClick?'pointer':'default', objectFit:'contain', flexShrink:0, ...style }}
      onClick={onClick}
    />
  );
}
