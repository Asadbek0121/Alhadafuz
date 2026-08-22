"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { useChatStore } from "@/store/useChatStore";

interface Announcement {
    id: string;
    text: string;
    backgroundColor?: string | null;
    textColor?: string | null;
    icon?: string | null;
    isActive: boolean;
    order: number;
}

// Default ranglar — admin tanlamasa ishlatiladi
const DEFAULT_BG = "#fef3c7";
const DEFAULT_FG = "#713f12";
const DARK_BG = ["#1e293b", "#0f172a", "#111827", "#000000", "#1e3a8a", "#7f1d1d", "#14532d", "#581c87"];

const isDarkBg = (bg?: string | null) => {
    if (!bg) return false;
    const b = bg.trim().toLowerCase();
    if (DARK_BG.some(d => b.startsWith(d))) return true;
    if (b.startsWith('#') && b.length === 7) {
        const r = parseInt(b.slice(1, 3), 16), g = parseInt(b.slice(3, 5), 16), bl = parseInt(b.slice(5, 7), 16);
        return (r * 0.299 + g * 0.587 + bl * 0.114) < 130;
    }
    return false;
};

const autoTextColor = (bg?: string | null) => isDarkBg(bg) ? "#f8fafc" : DEFAULT_FG;

/**
 * Header announcement marquee — admin panel orqali boshqariladi.
 *
 * - Faol announcementlar `/api/announcements` dan keladi (keshlangan)
 * - Bir nechta faol xabar bitta uzluksiz track'da ketma-ket chiqadi
 * - Seamless infinite loop: matn 3 marta takrorlanadi, translateX cheksiz
 * - Fade edges: container chetlarida 40px gradient mask
 * - Hover'da pause (desktop), reduced-motion'da harakat sekin
 * - "Yordam xizmatiga" → mavjud SupportChat
 */
export default function AnnouncementBar() {
    const { openMenu } = useChatStore();
    const reduceMotion = useReducedMotion();
    const [items, setItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const trackRef = useRef<HTMLDivElement>(null);
    const [dur, setDur] = useState(40);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/announcements');
                const data = await res.json();
                if (cancelled) return;
                const active = Array.isArray(data) ? data.filter((a: Announcement) => a.isActive) : [];
                setItems(active);
            } catch {
                if (!cancelled) setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Track kengligiga qarab animation duration dinamik.
    // Tezlik ~30px/s: matn uzun bo'lsa duration uzayadi.
    const measureDuration = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        const half = el.scrollWidth / 3;
        setDur(Math.max(20, Math.round(half / 30)));
    }, [items.length]);

    useEffect(() => {
        measureDuration();
        const t = setTimeout(measureDuration, 300);
        window.addEventListener('resize', measureDuration);
        return () => { clearTimeout(t); window.removeEventListener('resize', measureDuration); };
    }, [measureDuration]);

    // Hech qanday faol xabar yo'q — announcement ko'rinmaydi (location bar qoladi)
    if (loading || items.length === 0) return null;

    // Marquee track: har bir xabarni 3 marta takrorlab seamless halqa yasaymiz.
    const tracks = [...items, ...items, ...items];

    return (
        <div
            className="w-full h-[34px] overflow-hidden flex items-center relative"
            style={{
                background: items[0]?.backgroundColor || DEFAULT_BG,
                color: items[0]?.textColor || autoTextColor(items[0]?.backgroundColor)
            }}
        >
            {/* Fade edges — chap va o'ng chetlar yumshoq */}
            <div
                className="absolute inset-y-0 left-0 w-[40px] z-10 pointer-events-none"
                style={{ background: `linear-gradient(to right, ${items[0]?.backgroundColor || DEFAULT_BG}, transparent)` }}
            />
            <div
                className="absolute inset-y-0 right-0 w-[40px] z-10 pointer-events-none"
                style={{ background: `linear-gradient(to left, ${items[0]?.backgroundColor || DEFAULT_BG}, transparent)` }}
            />

            <div
                ref={trackRef}
                className="flex shrink-0 items-center marquee-announce"
                style={{
                    animationDuration: reduceMotion ? `${dur * 3}s` : `${dur}s`,
                    animationPlayState: reduceMotion ? 'paused' : 'running'
                }}
            >
                {tracks.map((item, i) => (
                    <span
                        key={`${item.id}-${i}`}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap pr-12"
                        style={{ fontSize: 12, fontWeight: 600, lineHeight: '34px' }}
                    >
                        {item.icon && <span>{item.icon}</span>}
                        <span>
                            {item.text.split('Yordam xizmatiga').map((part, pi, arr) => (
                                <span key={pi}>
                                    {part}
                                    {pi < arr.length - 1 && (
                                        <button
                                            type="button"
                                            onClick={openMenu}
                                            className="font-black underline underline-offset-2 decoration-current/40 hover:decoration-current cursor-pointer"
                                        >
                                            Yordam xizmatiga
                                        </button>
                                    )}
                                </span>
                            ))}
                        </span>
                    </span>
                ))}
            </div>

            <style>{`
                .marquee-announce {
                    animation-name: hadaf-announce-scroll;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    will-change: transform;
                }
                .marquee-announce:hover { animation-play-state: paused; }
                @keyframes hadaf-announce-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.3333%); }
                }
            `}</style>
        </div>
    );
}
