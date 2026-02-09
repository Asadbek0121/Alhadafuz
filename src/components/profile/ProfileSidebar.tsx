"use client";

import { Link, usePathname } from "@/navigation";
import { signOut } from "next-auth/react";
import { useUserStore } from "@/store/useUserStore";
import {
    User,
    Package,
    MapPin,
    Shield,
    LogOut,
    LayoutGrid,
    Settings,
    CreditCard,
    Bell,
    HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function ProfileSidebar() {
    const pathname = usePathname();
    const tProfile = useTranslations('Profile');
    const { logout } = useUserStore();

    const menuItems = [
        { title: tProfile('overview'), href: "/profile", icon: LayoutGrid },
        { title: tProfile('personal_info'), href: "/profile/info", icon: User },
        { title: tProfile('order_history'), href: "/profile/orders", icon: Package },
        { title: tProfile('addresses'), href: "/profile/addresses", icon: MapPin },
        { title: tProfile('notifications'), href: "/profile/notifications", icon: Bell },
        { title: tProfile('security'), href: "/profile/security", icon: Shield },
        { title: tProfile('settings'), href: "/profile/settings", icon: Settings },
        { title: tProfile('support'), href: "/support", icon: HelpCircle },
    ];

    const handleLogout = async () => {
        logout(); // Clear local store
        await signOut({ callbackUrl: "/" });
    };

    return (
        <aside className="hidden lg:flex flex-col w-[280px] shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                <div className="p-4 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 group text-[15px] font-medium",
                                    isActive
                                        ? "bg-primary/5 text-primary"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <item.icon
                                    size={20}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={cn(
                                        "transition-colors",
                                        isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-600"
                                    )}
                                />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-50 mt-2">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3.5 px-4 py-3.5 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium text-[15px] group"
                    >
                        <div className="w-5 h-5 flex items-center justify-center">
                            <LogOut size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <span>{tProfile('logout')}</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
