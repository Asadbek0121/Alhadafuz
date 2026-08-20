"use client";

import React, { useEffect, useRef, useState } from 'react';

// lottie-web `public/js/lottie.min.js` script'i orqali yuklanadi (layout'dagi
// beforeInteractive Script). Turbopack'ning production minifier'i lottie-web'ni
// bundle qilganda buzadi, shuning uchun self-hosted script + `window.lottie`
// global ishlatamiz.
declare global {
  interface Window {
    lottie?: {
      loadAnimation: (params: any) => AnimationItem;
    };
  }
}

interface AnimationItem {
  play: () => void;
  stop: () => void;
  destroy: () => void;
  goToAndStop: (value: number, isFrame?: boolean) => void;
  addEventListener?: (event: string, cb: () => void) => void;
}

/**
 * LordIcon Component
 *
 * Animated icons originally from Lordicon.com, rendered with lottie-web.
 *
 * Muhim: bu lordicon animatsiyalarining frame 0 holati to'liq emas — kirish
 * effektlari tufayli asosiy qismlar `display: none` bo'ladi (heart/cart/user).
 * Shuning uchun dam olish holatida STATIK ikonka (fallback) ko'rsatiladi,
 * lottie faqat hover'da o'ynaydi va tugagach yana statik holatga qaytadi.
 */

interface LordIconProps {
  src: string;
  trigger?: 'hover' | 'click' | 'loop' | 'loop-on-hover' | 'morph' | 'boomerang' | 'in' | 'none';
  delay?: number;
  colors?: string;
  size?: number | string;
  className?: string;
  stroke?: number | string;
  /** Dam olish holatida (va lottie ishlamasa) ko'rsatiladigan statik ikonka */
  fallback?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// JSON cache — bitta fayl bir marta yuklanadi, hamma LordIcon ulashadi
// ---------------------------------------------------------------------------
const jsonCache = new Map<string, Promise<any>>();

function fetchJson(src: string): Promise<any> {
  if (!jsonCache.has(src)) {
    const p = fetch(src).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${src}: HTTP ${r.status}`);
      return r.json();
    });
    jsonCache.set(src, p);
  }
  return jsonCache.get(src)!;
}

// ---------------------------------------------------------------------------
// Rang transform — lordicon `colors="primary:#..,secondary:#.."` semantikasini
// JSON'dagi ranglarga qo'llaydi.
// ---------------------------------------------------------------------------
const DARK_NEUTRALS = new Set(['#000000', '#121330', '#111130']);
const LIGHT_NEUTRALS = new Set(['#646e78', '#636d78', '#ebe6ee', '#d8d3dd']);

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (x: number) => Math.max(0, Math.min(255, Math.round(x * 255))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function parseColors(colors: string | undefined): { primary: [number, number, number] | null; secondary: [number, number, number] | null } {
  let primary: [number, number, number] | null = null;
  let secondary: [number, number, number] | null = null;
  if (colors) {
    for (const part of colors.split(',')) {
      const [name, value] = part.split(':');
      const rgb = value ? hexToRgb(value) : null;
      if (!rgb) continue;
      if (name === 'primary') primary = rgb;
      else if (name === 'secondary') secondary = rgb;
    }
  }
  return { primary, secondary };
}

function recolorJson(raw: any, colors: string | undefined): any {
  const { primary, secondary } = parseColors(colors);
  const monochrome = !!primary && !!secondary && primary[0] === secondary[0] && primary[1] === secondary[1] && primary[2] === secondary[2];
  if (!primary && !secondary) return raw;

  const clone = JSON.parse(JSON.stringify(raw));

  const setColor = (k: number[], rgb: [number, number, number]) => {
    k[0] = rgb[0] / 255;
    k[1] = rgb[1] / 255;
    k[2] = rgb[2] / 255;
  };

  const applyToRgb = (rgb: number[] | undefined, hex: string) => {
    if (!rgb || rgb.length < 3) return;
    if (monochrome && primary) {
      setColor(rgb, primary);
    } else if (primary && DARK_NEUTRALS.has(hex)) {
      setColor(rgb, primary);
    } else if (secondary && LIGHT_NEUTRALS.has(hex)) {
      setColor(rgb, secondary);
    }
  };

  const walk = (node: any) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const key of Object.keys(node)) {
      const val = node[key];
      if (key === 'c' || key === 'sc') {
        if (val && typeof val === 'object' && Array.isArray(val.k)) {
          if (val.k.length >= 3 && typeof val.k[0] === 'number') {
            applyToRgb(val.k, rgbToHex(val.k[0], val.k[1], val.k[2]));
          } else {
            for (const kf of val.k) {
              if (kf && Array.isArray(kf.s) && kf.s.length >= 3 && typeof kf.s[0] === 'number') {
                applyToRgb(kf.s, rgbToHex(kf.s[0], kf.s[1], kf.s[2]));
              }
            }
          }
        }
        continue;
      }
      walk(val);
    }
  };

  walk(clone);
  stripExpressions(clone);
  return clone;
}

// lordicon JSON'laridagi `x` (AE expression) maydonlarini olib tashlaydi.
// lottie-web `data.x` bo'lsa eval() chaqiradi (searchExpressions) — prod CSP'da
// 'unsafe-eval' yo'qligi uchun EvalError tashlanib, shape elementlar
// yaratilmay qoladi (bo'sh SVG).
function stripExpressions(data: any): void {
  const walk = (node: any) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const key of Object.keys(node)) {
      if (key === 'x') {
        delete node[key];
      } else {
        walk(node[key]);
      }
    }
  };
  walk(data);
}

// ---------------------------------------------------------------------------
// Lottie faqat hover paytida mount bo'ladi — frame 0'dagi yashirin holat hech
// qachon ko'rinmaydi. Animatsiya oxirgi frame'da to'xtaydi (to'liq holat),
// hover tugagach destroy qilinadi va statik ikonka qaytadi.
// ---------------------------------------------------------------------------
function LottieIconInner({
  data,
  size,
  className,
  onDone,
  loop = false,
}: {
  data: any;
  size: number | string;
  className?: string;
  onDone?: () => void;
  loop?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined' || !window.lottie) return;
    const anim = window.lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop,
      autoplay: true,
      animationData: data,
    });
    animRef.current = anim;
    if (!loop) anim.addEventListener?.('complete', () => onDone?.());
    return () => {
      anim.destroy();
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loop]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// Asosiy komponent
// ---------------------------------------------------------------------------
const LordIcon: React.FC<LordIconProps> = ({
  src,
  trigger = 'hover',
  delay = 0,
  colors,
  size = 24,
  className,
  fallback,
}) => {
  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchJson(src)
      .then((raw) => {
        if (!alive) return;
        const processed = JSON.parse(JSON.stringify(raw));
        stripExpressions(processed);
        setData(recolorJson(processed, colors));
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [src, colors]);

  // Loop trigger'lar (masalan faol BottomNav) — doimiy aylanadigan animatsiya
  const loopAnim = trigger === 'loop' || trigger === 'boomerang';
  // Hover/click trigger'lar — statik holatda turadi, faqat hover'da o'ynaydi
  const wantsPlay = trigger === 'hover' || trigger === 'loop-on-hover' || trigger === 'click';
  const showLottie = loopAnim
    ? !!data && !failed
    : !!data && !failed && hovering && wantsPlay && (playing || trigger !== 'click');

  const handleEnter = () => {
    if (!wantsPlay) return;
    setHovering(true);
    setPlaying(true);
  };
  const handleLeave = () => {
    setHovering(false);
  };
  const handleClick = () => {
    if (trigger === 'click') {
      setHovering(true);
      setPlaying(true);
    }
  };

  const renderStatic = () => (
    <div
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className={className}
      aria-hidden="true"
    >
      {fallback ?? (
        <svg viewBox="0 0 24 24" width={Number(size) * 0.6} height={Number(size) * 0.6} fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );

  return (
    <div
      style={{ display: 'contents' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
    >
      {showLottie ? (
        <LottieIconInner
          data={data}
          size={size}
          className={className}
          loop={loopAnim}
          onDone={() => {
            setPlaying(false);
            setHovering(false);
          }}
        />
      ) : (
        renderStatic()
      )}
    </div>
  );
};

export default LordIcon;
