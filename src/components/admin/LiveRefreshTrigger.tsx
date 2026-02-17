
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Radio } from "lucide-react";
import { toast } from "sonner";

export function LiveRefreshTrigger() {
    const router = useRouter();
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isEnabled, setIsEnabled] = useState(true);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!isEnabled) return;

        const interval = setInterval(() => {
            router.refresh();
            setLastUpdated(new Date());
        }, 3000); // Har 3 soniyada yangilash

        return () => clearInterval(interval);
    }, [isEnabled, router]);

    if (!mounted) {
        return <div className="hidden md:block h-[40px] w-[180px] bg-slate-50/50 animate-pulse rounded-full border border-slate-100" />;
    }

    return (
        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-full shadow-sm">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {isEnabled ? "Jonli Rejim" : "To'xtatilgan"}
                </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <RefreshCw size={12} className={isEnabled ? "animate-spin-slow" : ""} />
                {lastUpdated.toLocaleTimeString('uz-UZ', { hour12: false })}
            </div>

            <button
                onClick={() => setIsEnabled(!isEnabled)}
                className={`text-[10px] font-black px-3 py-1 rounded-full transition-all ${isEnabled
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                    }`}
            >
                {isEnabled ? "TO'XTATISH" : "YOQISH"}
            </button>
        </div>
    );
}
