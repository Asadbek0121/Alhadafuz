"use client";

import { Link, usePathname } from "@/navigation";
import {
    User,
    Package,
    MapPin,
    LayoutDashboard,
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

export default function BottomNav() {
    const pathname = usePathname();
    const tProfile = useTranslations('Profile');
    const { openAuthModal } = useUserStore();
    const { data: session } = useSession();
    const isAuthenticated = !!session?.user;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 flex items-center justify-around h-16 px-4 z-50">
            <Link href="/" className={cn("flex flex-col items-center justify-center flex-1 h-full transition-all", pathname === "/" ? "text-primary scale-110" : "text-text-muted")}>
                <LayoutDashboard size={22} className={pathname === "/" ? "stroke-[2.5px]" : "stroke-2"} />
                <span className="text-[10px] font-semibold mt-1 uppercase tracking-tight">Bosh sahifa</span>
            </Link>

            <div onClick={() => document.getElementById('category-btn-trigger')?.click()} className={cn("flex flex-col items-center justify-center flex-1 h-full transition-all text-text-muted cursor-pointer")}>
                <Package size={22} className="stroke-2" />
                <span className="text-[10px] font-semibold mt-1 uppercase tracking-tight">Katalog</span>
            </div>

            <Link href="/cart" className={cn("flex flex-col items-center justify-center flex-1 h-full transition-all", pathname === "/cart" ? "text-primary scale-110" : "text-text-muted")}>
                <ShoppingBag size={22} className={pathname === "/cart" ? "stroke-[2.5px]" : "stroke-2"} />
                <span className="text-[10px] font-semibold mt-1 uppercase tracking-tight">Savatcha</span>
            </Link>

            <Link href="/favorites" className={cn("flex flex-col items-center justify-center flex-1 h-full transition-all", pathname === "/favorites" ? "text-primary scale-110" : "text-text-muted")}>
                <Heart size={22} className={pathname === "/favorites" ? "stroke-[2.5px]" : "stroke-2"} />
                <span className="text-[10px] font-semibold mt-1 uppercase tracking-tight">Sevimlilar</span>
            </Link>

            <div
                onClick={(e) => {
                    if (!isAuthenticated) {
                        e.preventDefault();
                        openAuthModal();
                    } else {
                        window.location.href = "/profile";
                    }
                }}
                className={cn("flex flex-col items-center justify-center flex-1 h-full transition-all cursor-pointer", pathname.includes("/profile") ? "text-primary scale-110" : "text-text-muted")}
            >
                <User size={22} className={pathname.includes("/profile") ? "stroke-[2.5px]" : "stroke-2"} />
                <span className="text-[10px] font-semibold mt-1 uppercase tracking-tight">Kabinet</span>
            </div>
        </nav>
    );
}
