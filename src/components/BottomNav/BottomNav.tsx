"use client";

import { usePathname, Link } from '@/navigation';
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

    // Hide upon product or checkout pages
    if (pathname.includes('/product/') || pathname === '/checkout') return null;

    const navItems = [
        {
            label: t('bosh_sahifa'),
            icon: Home,
            href: "/",
            isActive: (pathname === "/" || pathname === "/uz" || pathname === "/ru") && !isCatalogOpen,
            action: () => closeCatalog(),
            fillable: false
        },
        {
            label: t('katalog'),
            icon: LayoutGrid,
            href: null, // Custom action
            isActive: isCatalogOpen,
            action: () => toggleCatalog(),
            fillable: false
        },
        {
            label: t('savatcha'),
            icon: ShoppingBag,
            href: "/cart",
            isActive: pathname === "/cart" && !isCatalogOpen,
            action: () => closeCatalog(),
            badge: isHydrated ? items.length : 0,
            fillable: false
        },
        {
            label: t('sevimlilar'),
            icon: Heart,
            href: "/favorites",
            isActive: pathname === "/favorites" && !isCatalogOpen,
            action: () => closeCatalog(),
            badge: wishlist.length,
            fillable: true
        },
        {
            label: t('kabinet'),
            icon: isAuthenticated ? User : UserCircle,
            href: isAuthenticated ? "/profile" : null,
            isActive: pathname.includes("/profile") && !isCatalogOpen,
            action: (e: any) => {
                closeCatalog();
                if (!isAuthenticated) {
                    e?.preventDefault();
                    openAuthModal();
                }
            },
            fillable: true
        }
    ];

    return (
        <nav className="lg:hidden fixed bottom-4 left-3 right-3 bg-white/85 backdrop-blur-2xl border border-white/30 shadow-[0_8px_25px_rgba(0,0,0,0.08)] grid grid-cols-5 items-center justify-items-center px-1 h-[60px] z-[100] rounded-[22px] transition-all duration-300">
            {navItems.map((item, idx) => {
                const Icon = item.icon;
                const active = item.isActive;

                const content = (
                    <div className={cn("flex flex-col items-center justify-center w-full h-full relative group transition-all duration-300")}>
                        <div className={cn(
                            "p-2 rounded-2xl relative transition-all duration-500 mb-0.5 flex items-center justify-center",
                            active ? "text-blue-600 -translate-y-1" : "text-slate-400 opacity-70 group-hover:opacity-100"
                        )}>
                            {/* Premium Glow Effect */}
                            {active && (
                                <div className="absolute inset-0 bg-blue-600/10 rounded-2xl blur-md -z-10 animate-pulse" />
                            )}
                            {active && (
                                <div className="absolute inset-0 bg-blue-50 rounded-xl -z-20 opacity-80" />
                            )}

                            <Icon
                                size={active ? 22 : 21}
                                className={cn("relative z-10 transition-all", active ? "stroke-[2.5px]" : "stroke-[2px]")}
                                fill={active && item.fillable ? "currentColor" : "none"}
                            />
                            {/* Badge */}
                            {(item.badge || 0) > 0 && (
                                <span className={cn(
                                    "absolute -top-1 -right-1 min-w-[15px] h-[15px] bg-[#ff3b30] text-white text-[8px] font-black flex items-center justify-center rounded-full border border-white shadow-sm z-20",
                                    active ? "scale-110" : ""
                                )}>
                                    {item.badge}
                                </span>
                            )}
                        </div>

                        <span className={cn(
                            "text-[9px] leading-tight transition-all duration-300 text-center",
                            active ? "font-bold text-blue-600 scale-100" : "font-medium text-slate-500 scale-95 opacity-80"
                        )}>
                            {item.label}
                        </span>
                    </div>
                );

                if (item.href) {
                    return (
                        <Link
                            key={idx}
                            href={item.href}
                            className="flex-1 h-full"
                            onClick={item.action}
                        >
                            {content}
                        </Link>
                    );
                }

                return (
                    <div
                        key={idx}
                        className="flex-1 h-full cursor-pointer"
                        onClick={item.action}
                    >
                        {content}
                    </div>
                );
            })}
        </nav>
    );
}
