import React from 'react';

/**
 * Apex Logo — The Pinnacle Esports Vector
 * Clean, razor-sharp, precisely uniform stroke geometry.
 * Built for the "Liquid Glass" theme with completely zero background artifacts.
 */
const ApexLogo = (props) => {
  return (
    <svg 
      {...props}
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: props.width || props.size || 24, height: props.height || props.size || 24, filter: 'drop-shadow(0px 0px 8px rgba(0, 212, 255, 0.4))' }}
    >
      <defs>
        <linearGradient id="apexNeon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#bf00ff" />
        </linearGradient>
      </defs>
      
      {/* 
        Symmetrical Aggressive Chevron pointing UP
        Perfect uniform horizontal width of 15 units.
        Outer: (50, 5) -> (15, 80) / (85, 80)
        Inner: (50, 32) -> (30, 80) / (70, 80)
      */}
      <path 
        d="M 50 5 L 15 80 L 30 80 L 50 32 L 70 80 L 85 80 Z" 
        fill="url(#apexNeon)" 
      />

      {/* 
        Floating Inner Crossbar Core 
        Points UP, perfectly parallel to the outer wings.
      */}
      <path 
        d="M 50 48 L 35 80 L 50 70 L 65 80 Z" 
        fill="url(#apexNeon)" 
      />
    </svg>
  );
};

export default ApexLogo;
