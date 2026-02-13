"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function TelegramAuthSync() {
    const { status } = useSession();
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        let attempts = 0;
        const checkTg = setInterval(() => {
            const tg = (window as any).Telegram?.WebApp;
            attempts++;

            if (tg) {
                clearInterval(checkTg);
                tg.ready();

                // Get start_param from various possible locations
                const startParam = tg.initDataUnsafe?.start_param ||
                    new URLSearchParams(window.location.search).get('tgWebAppStartParam');

                if (startParam?.startsWith('auth_') && status === 'unauthenticated' && !processed) {
                    const token = startParam.replace('auth_', '');
                    setProcessed(true);

                    // Generate a temporary device ID for tracking
                    let deviceId = localStorage.getItem('deviceId');
                    if (!deviceId) {
                        deviceId = 'tg-webapp-' + Math.random().toString(36).substring(2, 12);
                        localStorage.setItem('deviceId', deviceId);
                    }

                    toast.promise(
                        signIn('credentials', {
                            login: 'TELEGRAM_TOKEN',
                            password: token,
                            deviceId: deviceId,
                            deviceName: "Telegram Mini App",
                            redirect: false
                        }),
                        {
                            loading: "Avtomatik kirish tekshirilmoqda...",
                            success: (result: any) => {
                                if (result?.error) throw new Error(result.error);
                                // Small delay before reload to let session settle
                                setTimeout(() => window.location.reload(), 500);
                                return "Xush kelibsiz! Tizimga kirdingiz.";
                            },
                            error: (err) => {
                                console.error("Auto-login error:", err);
                                return "Avtomatik kirishda xatolik: " + (err.message || "Token yaroqsiz");
                            }
                        }
                    );
                }
            }

            if (attempts > 30) clearInterval(checkTg); // Max 3 seconds
        }, 100);

        return () => clearInterval(checkTg);
    }, [status, processed]);

    return null;
}
