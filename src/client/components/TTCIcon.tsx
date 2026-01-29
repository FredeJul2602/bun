// ============================================
// TTC Icon Component - The Tech Collective Logo
// ============================================

import React from 'react';

interface TTCIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export function TTCIcon({ size = 24, className = '', color = 'currentColor' }: TTCIconProps): React.ReactElement {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none"
      className={`ttc-icon ${className}`}
    >
      <rect width="100" height="100" rx="8" fill={color === 'currentColor' ? '#000000' : color} />
      <rect x="65" y="10" width="25" height="25" fill="#ffffff" />
      <rect x="80" y="25" width="6" height="6" fill={color === 'currentColor' ? '#000000' : color} />
    </svg>
  );
}

export function TTCIconLight({ size = 24, className = '' }: TTCIconProps): React.ReactElement {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none"
      className={`ttc-icon ${className}`}
    >
      <rect width="100" height="100" rx="8" fill="#ffffff" />
      <rect x="65" y="10" width="25" height="25" fill="#000000" />
      <rect x="80" y="25" width="6" height="6" fill="#ffffff" />
    </svg>
  );
}
