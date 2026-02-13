"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function TelegramAuthSync() {
    const { status } = useSession();
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        let attempts = 0;
        console.log("TelegramAuthSync: Initializing check...");

        const checkTg = setInterval(() => {
            const tg = (window as any).Telegram?.WebApp;
            attempts++;

            if (tg) {
                clearInterval(checkTg);
                console.log("TelegramAuthSync: WebApp found!", tg.initDataUnsafe);
                tg.ready();

                // Try to get token from multiple sources
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.slice(1));

                const startParam = tg.initDataUnsafe?.start_param ||
                    urlParams.get('start_param') ||
                    urlParams.get('tgWebAppStartParam') ||
                    hashParams.get('start_param');

                console.log("TelegramAuthSync: startParam =", startParam);

                if (startParam?.startsWith('auth_') && status === 'unauthenticated' && !processed) {
                    const token = startParam.replace('auth_', '');
                    setProcessed(true);
                    console.log("TelegramAuthSync: Attempting login with token:", token);

                    let deviceId = localStorage.getItem('deviceId');
                    if (!deviceId) {
                        deviceId = 'tg-webapp-' + Math.random().toString(36).substring(2, 12);
                        localStorage.setItem('deviceId', deviceId);
                    }

                    toast.info("Telegram orqali kirish jarayoni boshlandi...");

                    import("@/lib/fingerprint").then(({ getBrowserFingerprint }) => {
                        signIn('credentials', {
                            login: 'TELEGRAM_TOKEN',
                            password: token,
                            deviceId: deviceId,
                            deviceName: "Telegram App",
                            fingerprint: getBrowserFingerprint(),
                            redirect: false
                        }).then((result: any) => {
                            console.log("TelegramAuthSync: SignIn result:", result);
                            if (result?.ok && !result?.error) {
                                toast.success("Xush kelibsiz!");
                                setTimeout(() => window.location.href = '/', 800);
                            } else {
                                const errorMsg = result?.error || "Token noto'g'ri yoki muddati o'tgan";
                                toast.error("Kirishda xatolik: " + errorMsg);
                                console.error("Login failed:", errorMsg);
                            }
                        }).catch(err => {
                            console.error("SignIn catch error:", err);
                            toast.error("Tizimda xatolik yuz berdi");
                        });
                    });
                } else if (status === 'authenticated') {
                    console.log("TelegramAuthSync: Already authenticated.");
                } else if (!startParam) {
                    console.log("TelegramAuthSync: No startParam found.");
                }
            }

            if (attempts > 30) {
                clearInterval(checkTg);
                console.log("TelegramAuthSync: Max attempts reached, WebApp not found or no token.");
            }
        }, 300);

        return () => clearInterval(checkTg);
    }, [status, processed]);

    return null;
}
