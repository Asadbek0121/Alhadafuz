"use client";

import { useChatStore } from "@/store/useChatStore";

const TEXT_BEFORE = "🛠️ Sayt hozir test rejimida ishlamoqda. Kamchilik yoki xatolik topsangiz, ";
const TEXT_AFTER = " xabar qoldiring. Fikr va takliflaringiz Hadaf Market'ni yaxshilashga yordam beradi.";

/**
 * Sayt test rejimda ekanini ko'rsatuvchi announcement — uzluksiz marquee.
 *
 * Sariq background, faqat icon + matn. Dots/slide/popup YO'Q. Matn doimiy
 * gorizontal harakatlanadi. "Yordam xizmatiga" bosilganda mavjud SupportChat
 * ochiladi (yangi support tizimi yaratilmaydi). Bar balandligi ixcham (34px).
 */
export default function AnnouncementBar() {
    const { openMenu } = useChatStore();

    // Marquee matni ikki nusxa takrorlanadi — translateX -50% cheksiz
    // aylanishida uzilishsiz halqa hosil bo'ladi.
    const renderRow = (ariaHidden = false) => (
        <span
            aria-hidden={ariaHidden || undefined}
            className="inline-flex items-center gap-1.5 whitespace-nowrap pr-10"
        >
            <span className="text-[12px] font-semibold leading-none">
                {TEXT_BEFORE}
                <button
                    type="button"
                    onClick={openMenu}
                    className="font-black underline underline-offset-2 decoration-black/30 hover:decoration-black transition-colors cursor-pointer"
                >
                    Yordam xizmatiga
                </button>
                {TEXT_AFTER}
            </span>
        </span>
    );

    return (
        <div className="w-full h-[34px] overflow-hidden bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 text-amber-950 flex items-center border-y border-amber-200">
            <div className="relative flex w-full marquee-track">
                <div className="flex shrink-0 items-center">{renderRow()}</div>
                <div className="flex shrink-0 items-center">{renderRow(true)}</div>
            </div>
            <style>{`
                .marquee-track {
                    animation: hadaf-marquee 28s linear infinite;
                    will-change: transform;
                }
                .marquee-track:hover { animation-play-state: paused; }
                @keyframes hadaf-marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}
