"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function TelegramAuthSync() {
    const { status } = useSession();
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || processed) return;

        const tg = (window as any).Telegram?.WebApp;
        if (!tg) return;

        // Expanded for WebApp view
        tg.ready();
        tg.expand();

        const startParam = tg.initDataUnsafe?.start_param;

        if (startParam?.startsWith('auth_') && status === 'unauthenticated') {
            const token = startParam.replace('auth_', '');
            setProcessed(true);

            toast.promise(
                signIn('credentials', {
                    login: 'TELEGRAM_TOKEN',
                    password: token,
                    redirect: false
                }),
                {
                    loading: "Tizimga kirilmoqda...",
                    success: (result) => {
                        if (result?.error) throw new Error(result.error);
                        return "Mualliflik muvaffaqiyatli!";
                    },
                    error: "Avtomatik kirishda xatolik"
                }
            );
        }
    }, [status, processed]);

    return null;
}
