"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { usePathname, Link } from '@/navigation';
import { motion } from 'framer-motion';
import {
    User,
    Home,
    LayoutGrid,
    ShoppingBag,
    Heart,
    UserCircle
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/useUserStore";
import { useSession } from "next-auth/react";
import { useUIStore } from "@/store/useUIStore";
import { useWishlist } from "@/context/WishlistContext";
import { useCartStore } from '@/store/useCartStore';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

export default function BottomNav() {
    const pathname = usePathname();
    const t = useTranslations('Header');
    const { openAuthModal } = useUserStore();
    const { data: session } = useSession();
    const isAuthenticated = !!session?.user;
    const { isCatalogOpen, toggleCatalog, closeCatalog } = useUIStore();
    const { items, isHydrated } = useCartStore();
    const { wishlist } = useWishlist();

    const navItems = [
        { label: t('bosh_sahifa'), icon: Home, href: "/", isActive: (pathname === "/" || pathname === "/uz" || pathname === "/ru") && !isCatalogOpen, action: () => closeCatalog() },
        { label: t('katalog'), icon: LayoutGrid, href: null, isActive: isCatalogOpen, action: () => toggleCatalog() },
        { label: t('savatcha'), icon: ShoppingBag, href: "/cart", isActive: pathname === "/cart" && !isCatalogOpen, action: () => closeCatalog(), badge: isHydrated ? items.length : 0 },
        { label: t('sevimlilar'), icon: Heart, href: "/favorites", isActive: pathname === "/favorites" && !isCatalogOpen, action: () => closeCatalog(), badge: wishlist.length },
        { label: t('kabinet'), icon: isAuthenticated ? User : UserCircle, href: isAuthenticated ? "/profile" : null, isActive: pathname.includes("/profile") && !isCatalogOpen, action: (e: any) => { closeCatalog(); if (!isAuthenticated) { e?.preventDefault(); openAuthModal(); } } }
    ];

    if (pathname.includes('/product/') || pathname === '/checkout') return null;

    return (
        <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.1)] flex items-center justify-around h-[65px] z-[100] rounded-[24px] px-2">
            {navItems.map((item, idx) => {
                const Icon = item.icon;
                const active = item.isActive;

                return (
                    <div key={idx} className="relative flex-1 h-full flex items-center justify-center">
                        <Link
                            href={item.href || '#'}
                            className="relative z-10 flex flex-col items-center justify-center w-full h-full"
                            onClick={(e) => {
                                if (item.action) item.action(e);
                                if (!item.href) e.preventDefault();
                            }}
                        >
                            <motion.div
                                animate={{ 
                                    scale: active ? 1.3 : 1,
                                    color: active ? "#FFCA6C" : "#94a3b8"
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="relative flex items-center justify-center"
                            >
                                <Icon
                                    size={24}
                                    strokeWidth={active ? 2.5 : 2}
                                />
                                {(item.badge || 0) > 0 && (
                                    <span className={cn(
                                        "absolute -top-1 -right-1 min-w-[15px] h-[15px] bg-red-600 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-white",
                                        active ? "opacity-100" : "opacity-80"
                                    )}>
                                        {item.badge}
                                    </span>
                                )}
                            </motion.div>
                            
                            <span className={cn(
                                "text-[9px] mt-1 transition-all duration-300",
                                active ? "font-bold text-[#FFCA6C] opacity-100" : "font-medium text-slate-500 opacity-60"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    </div>
                );
            })}
        </nav>
    );
}
