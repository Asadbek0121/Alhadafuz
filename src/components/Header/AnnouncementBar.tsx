"use client";

import { useState, useEffect, useRef } from "react";
import { Wrench, MessageCircle, Rocket } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";

const ANNOUNCEMENTS = [
    { icon: Wrench, text: "Sayt hozir test rejimida ishlamoqda." },
    { icon: MessageCircle, text: "Kamchilik yoki xatolik topsangiz, Yordam xizmatiga xabar qoldiring.", cta: true },
    { icon: Rocket, text: "Fikr va takliflaringiz Hadaf Market'ni yaxshilashga yordam beradi." },
];

/**
 * Sayt test rejimda ekanini ko'rsatuvchi kichik announcement bar.
 *
 * Xabarlar har 3.5 soniyada silliq almashadi. "Yordam xizmatiga" matni
 * bosilganda mavjud SupportChat ochiladi (yangi support tizimi yaratilmaydi).
 * Bar balandligi ixcham (36px) — header umumiy tuzilishi o'zgarmaydi.
 */
export default function AnnouncementBar() {
    const { openMenu } = useChatStore();
    const [index, setIndex] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setIndex(prev => (prev + 1) % ANNOUNCEMENTS.length);
        }, 3500);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const item = ANNOUNCEMENTS[index];
    const Icon = item.icon;

    return (
        <div className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white h-[36px] overflow-hidden">
            <div className="container h-full flex items-center justify-center relative">
                {/* Xabarlar silliq almashadi — balandlik o'zgarmaydi */}
                <div className="relative w-full h-full flex items-center justify-center">
                    <div
                        key={index}
                        className="flex items-center gap-2 px-4 animate-announce-in"
                        style={{ animation: 'announceIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                        <Icon size={14} className="shrink-0 opacity-90" />
                        <p className="text-[12px] font-semibold leading-none truncate max-w-[92vw] md:max-w-none flex items-center gap-1">
                            {item.cta ? (
                                <>
                                    {"Kamchilik yoki xatolik topsangiz, "}
                                    <button
                                        type="button"
                                        onClick={openMenu}
                                        className="font-black underline underline-offset-2 decoration-white/60 hover:decoration-white transition-colors shrink-0 cursor-pointer"
                                    >
                                        Yordam xizmatiga
                                    </button>
                                    {" xabar qoldiring."}
                                </>
                            ) : (
                                item.text
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes announceIn {
                    0% { opacity: 0; transform: translateY(8px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
