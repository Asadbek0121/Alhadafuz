"use client";

import { useChatStore } from "@/store/useChatStore";
import { MessageCircle, ChevronRight } from "lucide-react";

interface ChatTriggerProps {
    title: string;
    subtitle: string;
}

export default function ChatTrigger({ title, subtitle }: ChatTriggerProps) {
    const { openMenu } = useChatStore();

    return (
        <button
            onClick={openMenu}
            className="w-full text-left bg-blue-600 text-white rounded-[1.25rem] p-3.5 md:p-8 shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 md:w-14 md:h-14 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform">
                        <MessageCircle size={18} className="md:w-7 md:h-7" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-sm md:text-xl font-black uppercase tracking-tighter leading-none">{title}</h3>
                        <p className="text-blue-100/70 text-[9px] md:text-sm font-bold mt-1">{subtitle}</p>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 md:w-6 md:h-6 opacity-40" strokeWidth={3} />
            </div>
        </button>
    );
}
