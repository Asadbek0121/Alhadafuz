"use client";

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

export default function TelegramLoginButton({ botName }: { botName: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    // const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        // Agar allaqachon script bo'lsa, qayta yuklamaymiz
        if (containerRef.current.querySelector('script')) return;

        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", botName);
        script.setAttribute("data-size", "large");
        script.setAttribute("data-radius", "10");
        script.setAttribute("data-request-access", "write");
        script.setAttribute("data-userpic", "false");
        script.setAttribute("data-onauth", "onTelegramAuth(user)");
        script.async = true;

        script.onload = () => {
            // setIsWidgetLoaded(true);
            console.log("Telegram widget loaded");
        };

        script.onerror = () => {
            toast.error("Telegram vidjeti yuklanmadi. Internetni tekshiring.");
        };

        containerRef.current.appendChild(script);

        // Global callback funksiyasini e'lon qilamiz
        (window as any).onTelegramAuth = async (user: TelegramUser) => {
            console.log("Telegram Auth User:", user);
            setIsLoading(true);
            try {
                localStorage.setItem('mergeCartOnLogin', 'true');

                // NextAuth ga signal yuboramiz
                const result = await signIn('telegram-login', {
                    ...user,
                    redirect: false,
                    callbackUrl: window.location.href
                });

                if (result?.error) {
                    console.error("Login Result Error:", result.error);
                    toast.error("Telegram orqali kirishda xatolik yuz berdi");
                    localStorage.removeItem('mergeCartOnLogin');
                } else {
                    toast.success("Muvaffaqiyatli kirildi!");
                    window.location.reload();
                }
            } catch (error) {
                console.error("Login Catch Error:", error);
                toast.error("Tizim xatosi");
                localStorage.removeItem('mergeCartOnLogin');
            } finally {
                setIsLoading(false);
            }
        };

        return () => {
            // Cleanup cleanups if needed, but usually removing script implies reload
            // delete (window as any).onTelegramAuth;
        };
    }, [botName]);

    return (
        <div className="w-full flex justify-center h-12">
            {isLoading ? (
                <div className="flex items-center gap-2 text-blue-500">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="text-sm font-medium">Kirish...</span>
                </div>
            ) : (
                <div ref={containerRef} className="telegram-widget-container flex justify-center items-center w-full" />
            )}
        </div>
    );
}
