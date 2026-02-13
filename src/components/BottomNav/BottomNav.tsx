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

    // Hide upon product detail pages
    if (pathname.includes('/product/')) return null;

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
        <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-blue-900/10 flex items-center justify-between px-2 h-[72px] z-[100] rounded-3xl transition-all duration-300">
            {navItems.map((item, idx) => {
                const Icon = item.icon;
                const active = item.isActive;

                const content = (
                    <div className={cn("flex flex-col items-center justify-center w-full h-full py-1 relative group")}>
                        {/* Active Glow Background */}
                        {active && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-2xl -z-10 animate-fade-in opacity-70" />
                        )}

                        <div className={cn("p-1.5 rounded-2xl transition-all duration-300 mb-0.5 relative", active ? "text-blue-600 -translate-y-1" : "text-slate-400 group-hover:text-slate-600")}>
                            {active && <div className="absolute inset-0 bg-blue-50 rounded-xl blur-sm animate-pulse"></div>}
                            <Icon
                                size={active ? 26 : 24}
                                className={cn("relative z-10 transition-all", active ? "stroke-[2.5px]" : "stroke-[1.5px]")}
                                fill={active && item.fillable ? "currentColor" : "none"}
                            />
                            {/* Badge for Cart */}
                            {(item.badge || 0) > 0 && (
                                <span className={cn(
                                    "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#ff6b00] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white",
                                    active ? "scale-110" : ""
                                )}>
                                    {item.badge}
                                </span>
                            )}
                        </div>

                        <span className={cn("text-[10px] tracking-wide transition-all duration-300", active ? "font-bold text-blue-600" : "font-medium text-slate-400 scale-90 opacity-80")}>
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
