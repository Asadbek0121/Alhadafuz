"use client";

import React, { useEffect, useRef, useState } from 'react';

// lottie-web `public/js/lottie.min.js` script'i orqali yuklanadi (layout'dagi
// beforeInteractive Script). Turbopack'ning production minifier'i lottie-web'ni
// bundle qilganda buzadi (dev ishlaydi, prod'da bo'sh SVG chiqadi), shuning
// uchun self-hosted script + `window.lottie` global ishlatamiz.
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
}

/**
 * LordIcon Component
 *
 * Animated icons originally from Lordicon.com, rendered with lottie-web.
 * (The lordicon player crashes on these JSON files — renders empty SVGs —
 * so we render the same animations with plain lottie-web instead.)
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
// JSON'dagi ranglarga qo'llaydi. JSON'lar o'z default ranglariga ega:
//   - to'q neytrallar (#000000, #121330) -> "primary" slot
//   - och neytrallar (#646e78, #636d78, #ebe6ee) -> "secondary" slot
//   - aksent ranglar (pushti, qizil, sariq) -> saqlanadi
// primary === secondary bo'lsa (monoxrom), hamma rang shu rangga o'tadi.
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
            // statik rang
            applyToRgb(val.k, rgbToHex(val.k[0], val.k[1], val.k[2]));
          } else {
            // animatsiyalangan rang — keyframe'lar (k: [{t, s:[r,g,b,a]}, ...])
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
// yaratilmay qoladi (bo'sh SVG). Expression'lar faqat lordicon player'ning
// rang boshqaruvi uchun edi — rang transform'ni o'zimiz qilamiz.
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
// Ichki komponent — lottie faqat data tayyor bo'lgach mount bo'ladi
// ---------------------------------------------------------------------------
function LottieIconInner({
  data,
  trigger,
  delay,
  size,
  className,
}: {
  data: any;
  trigger: LordIconProps['trigger'];
  delay: number;
  size: number | string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  const loop = trigger === 'loop' || trigger === 'loop-on-hover' || trigger === 'boomerang';
  const autoplay = trigger === 'loop' || trigger === 'boomerang';

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined' || !window.lottie) return;
    // autoplay:true bilan yuklaymiz (barcha layer'lar to'liq init bo'ladi), so'ng
    // autoplay kerak bo'lmasa darhol 0-frame'ga qaytaramiz. Bu autoplay:false'dagi
    // "bo'sh SVG" muammosini oldini oladi (lottie 5.13 quirk).
    const anim = window.lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop,
      autoplay: true,
      animationData: data,
    });
    animRef.current = anim;

    if (!autoplay) {
      // Bir nechta frame o'ynatib, so'ng 0-frame'da to'xtatamiz — content to'liq chiziladi
      const stopAt0 = () => {
        try {
          anim.stop();
          anim.goToAndStop(0, true);
        } catch {
          /* ignore */
        }
      };
      const t1 = setTimeout(stopAt0, 100);
      const t2 = setTimeout(stopAt0, 400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        anim.destroy();
        animRef.current = null;
      };
    }

    return () => {
      anim.destroy();
      animRef.current = null;
    };
  }, [data, loop, autoplay]);

  const handleEnter = () => {
    if (trigger === 'hover' || trigger === 'loop-on-hover') animRef.current?.play();
  };
  const handleLeave = () => {
    if (trigger === 'hover' || trigger === 'loop-on-hover') animRef.current?.goToAndStop(0, true);
  };
  const handleClick = () => {
    if (trigger === 'click') {
      animRef.current?.goToAndStop(0, true);
      animRef.current?.play();
    }
  };

  // delay (soniyalarda) — loop bo'lmagan triggerlar uchun kechiktirilgan play
  useEffect(() => {
    if (delay <= 0 || autoplay) return;
    const t = setTimeout(() => animRef.current?.play(), delay * 1000);
    return () => clearTimeout(t);
  }, [delay, autoplay]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className={className}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
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
}) => {
  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchJson(src)
      .then((raw) => {
        if (!alive) return;
        // Expression'lar (x) eval trig'laydi — prod CSP'da bloklanadi. Har doim
        // yangi klon ustida strip qilamiz (keshdagi raw'ni buzmaymiz).
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

  if (failed) {
    return (
      <div
        style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        className={className}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width={Number(size) * 0.6} height={Number(size) * 0.6} fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (!data) {
    // Yuklanayotganda joy egallab turadi — layout siljimaydi
    return <div style={{ width: size, height: size }} className={className} aria-hidden="true" />;
  }

  return <LottieIconInner data={data} trigger={trigger} delay={delay} size={size} className={className} />;
};

export default LordIcon;
