"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useUserStore } from "@/store/useUserStore";

/**
 * AuthModal uchun yuklash darvozasi.
 *
 * Modal har bir sahifaning layout'ida turadi, lekin o'zi bilan lottie-react
 * (lottie-web ~300 KB) va framer-motion'ni tortadi. Ilgari statik import
 * qilingani uchun bu og'irlik modal yopiq turganda ham har bir sahifaga
 * tushardi. Endi haqiqiy modal faqat birinchi marta ochilganda yuklanadi.
 *
 * Bir marta yuklangandan keyin mount qilingan holda qoladi — takroran ochish
 * darhol ishlaydi va yopilish animatsiyasi (AnimatePresence modal ichida)
 * to'liq o'ynaydi.
 */
const AuthModal = dynamic(() => import("./AuthModal"), { ssr: false });

type DeepLink = {
    mode: "login" | "register";
    success: boolean;
    requested: boolean;
};

/**
 * `?auth=login`, `?auth=register`, `?resetSuccess=true` havolalarini o'qiydi.
 *
 * Modal yuklanishidan oldin, render paytida o'qiladi — aks holda lazy chunk
 * kelguncha URL parametri o'z ta'sirini yo'qotardi.
 */
function readDeepLink(): DeepLink {
    if (typeof window === "undefined") {
        return { mode: "login", success: false, requested: false };
    }
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    const success = params.get("resetSuccess") === "true";

    return {
        mode: auth === "register" ? "register" : "login",
        success,
        requested: auth === "login" || auth === "register" || success,
    };
}

export default function AuthModalGate() {
    const { isModalOpen, openAuthModal } = useUserStore();
    const [deepLink] = useState<DeepLink>(readDeepLink);

    // Modal bir marta ochilgach mount qilingan holda qoladi. Render paytida
    // hisoblanadi — effekt ichida setState qilish keraksiz qayta render beradi.
    const [everOpened, setEverOpened] = useState(false);
    if (isModalOpen && !everOpened) {
        setEverOpened(true);
    }

    // Faqat tashqi tizimlarni sinxronlash: zustand store va brauzer URL'i.
    useEffect(() => {
        if (!deepLink.requested) return;
        openAuthModal();
        window.history.replaceState({}, "", window.location.pathname);
    }, [deepLink.requested, openAuthModal]);

    if (!everOpened) return null;

    return <AuthModal initialMode={deepLink.mode} initialSuccess={deepLink.success} />;
}
