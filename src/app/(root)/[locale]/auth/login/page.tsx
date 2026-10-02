"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import TelegramLoginButton from "@/components/Auth/TelegramLoginButton";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { status } = useSession();
    const [botUsername, setBotUsername] = useState<string | null>(BOT_USERNAME || null);
    const [checking, setChecking] = useState(!BOT_USERNAME);

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/profile");
        }
    }, [status, router]);

    useEffect(() => {
        if (BOT_USERNAME) return;
        let cancelled = false;
        fetch("/api/auth/telegram/config")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled) return;
                setBotUsername(data?.botUsername || null);
                setChecking(false);
            })
            .catch(() => {
                if (!cancelled) setChecking(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#2ba6e1]/10 flex items-center justify-center">
                    <svg fill="#2ba6e1" viewBox="0 0 24 24" className="w-9 h-9">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.774-.417-1.2.258-1.902.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.445.895-.694 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                </div>

                <h1 className="text-xl font-black text-slate-800 mb-2">Telegram orqali kirish</h1>
                <p className="text-sm text-slate-400 font-medium mb-6">
                    HADAF Market akkauntingizga Telegram akkauntingiz bilan xavfsiz kiring.
                </p>

                {status === "loading" || checking ? (
                    <div className="h-12 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={22} />
                    </div>
                ) : botUsername ? (
                    <TelegramLoginButton botName={botUsername} />
                ) : (
                    <div className="h-12 flex items-center justify-center text-sm text-red-500 font-bold rounded-xl bg-red-50">
                        Telegram orqali kirish hozircha mavjud emas
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mt-6 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                    Orqaga qaytish
                </button>
            </div>
        </div>
    );
}
