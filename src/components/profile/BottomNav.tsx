"use client";

import { Link, usePathname } from "@/navigation";
import {
    User,
    Package,
    MapPin,
    LayoutDashboard
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTranslations } from "next-intl";

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

export default function BottomNav() {
    const pathname = usePathname();
    const tProfile = useTranslations('Profile');

    const menuItems = [
        { title: tProfile('overview'), href: "/profile", icon: LayoutDashboard },
        { title: tProfile('personal_info'), href: "/profile/info", icon: User },
        { title: tProfile('order_history'), href: "/profile/orders", icon: Package },
        { title: tProfile('addresses'), href: "/profile/addresses", icon: MapPin },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 flex items-center justify-around h-16 px-4 z-50">
            {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 h-full transition-all",
                            isActive ? "text-primary scale-110" : "text-text-muted"
                        )}
                    >
                        <item.icon size={22} className={isActive ? "stroke-[2.5px]" : "stroke-2"} />
                        <span className="text-[10px] font-semibold mt-1 uppercase tracking-tight">{item.title}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
