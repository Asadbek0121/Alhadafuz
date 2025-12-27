"use client";

import { Link, usePathname } from "@/navigation";
import {
    User,
    Home,
    LayoutGrid,
    ShoppingBag,
    Heart
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTranslations } from "next-intl";

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

import { useUserStore } from "@/store/useUserStore";
import { useSession } from "next-auth/react";
import { useUIStore } from "@/store/useUIStore";

export default function BottomNav() {
    const pathname = usePathname();
    const tProfile = useTranslations('Profile');
    const { openAuthModal } = useUserStore();
    const { data: session } = useSession();
    const isAuthenticated = !!session?.user;
    const { isCatalogOpen, toggleCatalog, closeCatalog } = useUIStore();

    const navItems = [
        {
            label: "Bosh sahifa",
            icon: Home,
            href: "/",
            isActive: pathname === "/" && !isCatalogOpen,
            action: () => closeCatalog()
        },
        {
            label: "Katalog",
            icon: LayoutGrid,
            href: null, // Custom action
            isActive: isCatalogOpen,
            action: () => toggleCatalog()
        },
        {
            label: "Savatcha",
            icon: ShoppingBag,
            href: "/cart",
            isActive: pathname === "/cart" && !isCatalogOpen,
            action: () => closeCatalog()
        },
        {
            label: "Sevimlilar",
            icon: Heart,
            href: "/favorites",
            isActive: pathname === "/favorites" && !isCatalogOpen,
            action: () => closeCatalog()
        },
        {
            label: "Kabinet",
            icon: User,
            href: isAuthenticated ? "/profile" : null,
            isActive: pathname.includes("/profile") && !isCatalogOpen,
            action: (e: any) => {
                closeCatalog();
                if (!isAuthenticated) {
                    e?.preventDefault();
                    openAuthModal();
                }
            }
        }
    ];

    return (
        <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-blue-900/10 flex items-center justify-between px-2 h-[72px] z-[100] rounded-3xl transition-all duration-300">
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
                            {active && <div className="absolute inset-0 bg-blue-100/50 rounded-xl blur-sm animate-pulse"></div>}
                            <Icon
                                size={active ? 26 : 24}
                                className={cn("relative z-10 transition-all", active ? "stroke-[2.5px]" : "stroke-[1.5px]")}
                                fill={active ? "currentColor" : "none"}
                            />
                        </div>

                        <span className={cn("text-[10px] tracking-wide transition-all duration-300", active ? "font-bold text-blue-600" : "font-medium text-slate-400 scale-90 opacity-80")}>
                            {item.label}
                        </span>

                        {/* Active Dot indicator at bottom */}
                        {active && (
                            <div className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full"></div>
                        )}
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
