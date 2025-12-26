"use client";

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';

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
    const scriptRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!scriptRef.current) return;
        // Avoid duplication
        if (scriptRef.current.querySelector('script')) return;

        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", botName);
        script.setAttribute("data-size", "large");
        script.setAttribute("data-userpic", "false");
        script.setAttribute("data-request-access", "write");
        script.setAttribute("data-onauth", "onTelegramAuth(user)");
        script.async = true;

        script.onload = () => console.log("Telegram widget script loaded successfully.");
        script.onerror = (e) => console.error("Telegram widget script failed to load:", e);

        scriptRef.current.appendChild(script);

        (window as any).onTelegramAuth = async (user: TelegramUser) => {
            console.log("Telegram Auth Callback triggered:", user);
            setIsLoading(true);
            try {
                localStorage.setItem('mergeCartOnLogin', 'true');
                const result = await signIn('telegram-login', {
                    ...user,
                    redirect: false
                });

                if (result?.error) {
                    toast.error("Telegram orqali kirishda xatolik");
                    localStorage.removeItem('mergeCartOnLogin');
                } else {
                    toast.success("Muvaffaqiyatli kirildi!");
                    window.location.reload();
                }
            } catch (error) {
                console.error(error);
                toast.error("Tizim xatosi");
                localStorage.removeItem('mergeCartOnLogin');
            } finally {
                setIsLoading(false);
            }
        };
    }, [botName]);

    const handleFallbackClick = () => {
        // Did the widget fail to cover this button?
        toast.error("Telegram Bot sozlanmagan! (BotFather domen sozlamalarini tekshiring)");
    };

    return (
        <div className="relative w-full h-full z-10">
            {/* Custom Visual Button */}
            <button
                className={`flex items-center justify-center w-full h-12 border border-gray-200 rounded-xl transition-colors gap-3 ${isHovered ? 'bg-gray-50 border-gray-300' : 'bg-white'
                    }`}
                type="button"
            >
                {isLoading ? (
                    <span className="text-sm text-gray-500">Kirish...</span>
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21.1 4.30005L18.7 16.9C18.4 18.2 17.6 18.6 16.6 18.1L11 13.9L8.3 16.5C8 16.8 7.8 17 7.2 17L7.6 11.4L17.8 2.20005C18.2 1.80005 17.7 1.60005 17.1 2.00005L4.5 9.90005L-0.9 8.20005C-1.3 8.10005 -1.3 7.40005 -0.8 7.20005L20.2 -0.899951C21.2 -1.29995 22 0.300049 21.1 4.30005Z" fill="#229ED9" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">Telegram</span>
                    </>
                )}
            </button>

            {/* Invisible Overlay Widget Container */}
            <div
                ref={scriptRef}
                className="absolute inset-0 w-full h-full opacity-0 z-20 overflow-hidden cursor-pointer"
                style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}
                onClick={handleFallbackClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Script will inject iframe here. */}
            </div>
        </div>
    );
}
