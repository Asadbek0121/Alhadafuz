"use client";

import { usePathname, useRouter } from "@/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProfileMobileHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations('Profile');

    // Only show on mobile and NOT on the main profile page
    if (pathname === '/profile') return null;

    const getTitle = () => {
        if (pathname.includes('/orders')) return t('my_orders');
        if (pathname.includes('/addresses')) return t('my_addresses');
        if (pathname.includes('/notifications')) return t('notifications');
        if (pathname.includes('/settings')) return t('settings');
        if (pathname.includes('/security')) return t('security');
        if (pathname.includes('/wishlist') || pathname.includes('/favorites')) return t('wishlist');
        if (pathname.includes('/info')) return t('personal_info');
        return t('back');
    };

    return (
        <div className="lg:hidden flex items-center gap-4 p-4 sticky top-0 z-40">
            <button
                onClick={() => router.back()}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg shadow-gray-900/20 active:scale-95 hover:bg-gray-800 transition-all duration-200"
                aria-label="Back"
            >
                <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{getTitle()}</h1>
        </div>
    );
}
