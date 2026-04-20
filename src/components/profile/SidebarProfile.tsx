"use client";

import { Link, usePathname } from "@/navigation";
import { signOut, useSession } from "next-auth/react";
import { useUserStore } from "@/store/useUserStore";
import {
    User,
    Package,
    MapPin,
    Shield,
    LogOut,
    LayoutGrid,
    Settings,
    Bell,
    HelpCircle,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function SidebarProfile() {
    const pathname = usePathname();
    const tProfile = useTranslations('Profile');
    const { logout } = useUserStore();
    const { data: session } = useSession();

    const userRole = (session?.user as any)?.role;
    const isAdmin = userRole === 'ADMIN';

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
            <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden sticky top-24">
                <div className="p-3 space-y-1">
                    {menuItems.map((item: any) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group text-[15px] font-semibold",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                                )}
                            >
                                <div className="flex items-center gap-3.5">
                                    <Icon
                                        size={20}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={cn(
                                            "transition-colors",
                                            isActive ? "text-white" : "text-slate-400 group-hover:text-blue-600"
                                        )}
                                    />
                                    <span>{item.title}</span>
                                </div>
                                <ChevronRight 
                                    size={16} 
                                    className={cn(
                                        "transition-transform duration-300",
                                        isActive ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                                    )} 
                                />
                            </Link>
                        );
                    })}
                </div>

                <div className="p-3 border-t border-slate-50 mt-1">
                    <button 
                        title="Logout"
                        onClick={handleLogout}
                        className="flex items-center gap-3.5 px-4 py-3.5 w-full text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300 font-bold text-[15px] group"
                    >
                        <div className="w-5 h-5 flex items-center justify-center">
                            <LogOut size={20} strokeWidth={2.5} className="group-hover:scale-110 group-hover:-translate-x-1 transition-all" />
                        </div>
                        <span>{tProfile('logout')}</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
