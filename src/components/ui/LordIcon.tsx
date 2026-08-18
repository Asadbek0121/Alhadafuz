"use client";

import React, { useState } from 'react';

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

// lord-icon types are now handled in @/types/lordicon.d.ts

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

  // lord-icon custom elementi ro'yxatdan o'tmagan bo'lsa (script yuklanmagan/bloklangan)
  // — ikonka umuman ko'rinmay qolmasligi uchun oddiy fallback ko'rsatiladi.
  // beforeInteractive script head'da sinxron yuklangani uchun hydration vaqtida ro'yxatdan o'tgan bo'ladi.
  const [missing] = useState(() => {
    if (typeof window === 'undefined' || typeof customElements === 'undefined') return false;
    return !customElements.get('lord-icon');
  });

  if (missing) {
    return (
      <div
        style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        className={className}
      >
        <svg viewBox="0 0 24 24" width={Number(size) * 0.6} height={Number(size) * 0.6} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

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
