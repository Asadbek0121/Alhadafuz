"use client";

import React from 'react';

/**
 * LordIcon Component 
 * Animated icons from Lordicon.com
 */

interface LordIconProps {
  src: string;
  trigger?: 'hover' | 'click' | 'loop' | 'loop-on-hover' | 'morph' | 'boomerang' | 'in' | 'none';
  delay?: number;
  colors?: string;
  size?: number | string;
  className?: string;
  stroke?: number | string;
}

// Extend JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lord-icon': any;
    }
  }
}

const LordIcon: React.FC<LordIconProps> = ({ 
  src, 
  trigger = 'hover', 
  delay = 0,
  colors,
  size = 24,
  className,
  stroke = "40"
}) => {
  const defaultColors = "primary:#1e293b,secondary:#2563eb";

  return (
    <div 
      style={{ 
        width: size, 
        height: size, 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }} 
      className={className}
    >
      <lord-icon
        key={src}
        src={src}
        trigger={trigger}
        delay={delay}
        colors={colors || defaultColors}
        stroke={stroke}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default LordIcon;
