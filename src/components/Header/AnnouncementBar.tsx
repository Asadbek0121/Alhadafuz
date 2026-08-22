"use client";

import { useState, useEffect, useRef } from "react";
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
 * - Seamless infinite loop: matn yetarlicha marta takrorlanadi,
 *   translateX bitta kopiya kengligida cheksiz aylanadi
 * - Fade edges: container chetlarida gradient mask
 * - Hover'da pause (CSS), "Yordam xizmatiga" → mavjud SupportChat
 */
export default function AnnouncementBar() {
    const { openMenu } = useChatStore();
    const [items, setItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const trackRef = useRef<HTMLDivElement>(null);
    const [dur, setDur] = useState(30);
    // Har bir kopiya kengligi — seamless loop uchun translateX shunga tayanadi
    const [copyCount, setCopyCount] = useState(3);

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

    // Track o'lchamini o'lchab: kopiya soni va duration'ni aniqlaymiz.
    // Marquee hech qachon to'xtamaydi — faqat tezlik matn uzunligiga bog'liq.
    useEffect(() => {
        if (items.length === 0) return;
        let raf = 0;
        const measure = () => {
            const el = trackRef.current;
            if (!el) return;
            const copyEl = el.querySelector('[data-copy]') as HTMLElement | null;
            if (!copyEl) return;
            const copyW = copyEl.offsetWidth;
            const containerW = el.parentElement?.clientWidth || 0;
            // Konteynerni kamida 3 marta to'ldiradigan kopiya soni
            const copies = Math.max(3, Math.ceil((containerW * 3) / Math.max(1, copyW)) + 1);
            setCopyCount(copies);
            // Tezlik ~35px/s — matn uzun bo'lsa duration uzayadi
            setDur(Math.max(18, Math.round((copyW * copies) / (35 * 3))));
        };
        raf = window.requestAnimationFrame(measure);
        const t = setTimeout(measure, 300);
        window.addEventListener('resize', measure);
        return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', measure); };
    }, [items.length]);

    // Hech qanday faol xabar yo'q — announcement ko'rinmaydi (location bar qoladi)
    if (loading || items.length === 0) return null;

    // Seamless loop: track = N kopiya (har kopiya = barcha announcementlar).
    // translateX(-100%/N) bir kopiyaga teng — cheksiz takrorlanadi, jump yo'q.
    const tracks = Array.from({ length: copyCount }, (_, i) => ({ items, key: i }));

    return (
        <div
            className="w-full h-[34px] overflow-hidden flex items-center relative"
            style={{
                background: items[0]?.backgroundColor || DEFAULT_BG,
                color: items[0]?.textColor || autoTextColor(items[0]?.backgroundColor)
            }}
        >
            {/* Fade edges — 80px, yumshoq, hard edge yo'q */}
            <div
                className="absolute inset-y-0 left-0 w-[80px] z-10 pointer-events-none"
                style={{ background: `linear-gradient(to right, ${items[0]?.backgroundColor || DEFAULT_BG}, transparent)` }}
            />
            <div
                className="absolute inset-y-0 right-0 w-[80px] z-10 pointer-events-none"
                style={{ background: `linear-gradient(to left, ${items[0]?.backgroundColor || DEFAULT_BG}, transparent)` }}
            />

            <div
                ref={trackRef}
                data-track
                className="marquee-announce"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                    width: 'max-content',
                    animationDuration: `${dur}s`,
                    // translateX % elementi o'z kengligiga nisbatan — bitta kopiya
                    // (100/N %) siljiganda layout aynan takrorlanadi (seamless)
                    ['--marquee-shift' as any]: `${100 / copyCount}%`
                }}
            >
                {tracks.map(({ items: copyItems, key }) => (
                    <div key={key} data-copy className="flex shrink-0 items-center">
                        {copyItems.map((item) => (
                            <span
                                key={`${key}-${item.id}`}
                                className="inline-flex items-center gap-1.5 pr-12"
                                style={{ fontSize: 12, fontWeight: 600, lineHeight: '34px', whiteSpace: 'nowrap' }}
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
                ))}
            </div>

            <style>{`
                .marquee-announce {
                    animation-name: hadaf-announce-scroll;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    animation-play-state: running;
                    will-change: transform;
                }
                .marquee-announce:hover { animation-play-state: paused; }
                @keyframes hadaf-announce-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(calc(-1 * var(--marquee-shift, 33.333%))); }
                }
            `}</style>
        </div>
    );
}
