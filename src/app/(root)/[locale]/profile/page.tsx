"use client";

import { useUserStore } from "@/store/useUserStore";
import {
    Package, Wallet, Heart, ArrowRight, TrendingUp, Clock, CheckCircle2,
    MapPin, CreditCard, Globe, HelpCircle, LogOut, ChevronRight, Settings,
    User, Bell, Shield, LayoutDashboard, X
} from "lucide-react";
import { Link } from "@/navigation";
import NextLink from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import InstallAppButtons from "@/components/InstallAppButtons";

export default function ProfileOverviewPage() {
    const { user, openAuthModal } = useUserStore();
    const tProfile = useTranslations('Profile');
    const tHeader = useTranslations('Header');
    const currentLocale = useLocale();
    const { data: session, status, update: updateSession } = useSession();
    const [statsData, setStatsData] = useState({
        ordersCount: 0,
        wishlistCount: 0,
        balance: 0,
        ordersByStatus: {
            pending: 0,
            processing: 0,
            delivered: 0,
            cancelled: 0
        }
    });

    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            openAuthModal();
        }
    }, [status, openAuthModal]);

    useEffect(() => {
        if (session?.user && !hasFetched) {
            setHasFetched(true);
            // 1. Fetch Stats
            fetch('/api/user/stats')
                .then(res => res.json())
                .then(data => {
                    if (!data.error) setStatsData(data);
                })
                .catch(err => console.error(err));

            // 2. Fetch Fresh User Info
            fetch('/api/user/info')
                .then(res => res.ok ? res.json() : null)
                .then(dbUser => {
                    if (!dbUser || dbUser.error) return;

                    const sessionRole = (session.user as any).role;
                    const sessionId = (session.user as any).uniqueId;

                    const roleMismatch = dbUser.role !== sessionRole;
                    const idMismatch = dbUser.uniqueId !== sessionId;

                    if (roleMismatch || idMismatch) {
                        updateSession({
                            role: dbUser.role,
                            uniqueId: dbUser.uniqueId
                        });
                    }
                })
                .catch(err => console.error("Session sync failed:", err));
        }
    }, [session, hasFetched, updateSession]);

    // Check for panel access (Admin or Vendor)
    const isAdmin = (user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'ADMIN';
    const isVendor = (user as any)?.role === 'VENDOR' || (session?.user as any)?.role === 'VENDOR';
    const hasPanelAccess = isAdmin || isVendor;

    const stats = [
        { label: tProfile('active_orders'), value: statsData.ordersCount.toString(), icon: Package, color: "text-blue-600", bg: "bg-blue-50", href: "/profile/orders" },
        { label: tProfile('my_bonuses'), value: statsData.balance.toLocaleString(), icon: Wallet, color: "text-green-600", bg: "bg-green-50", href: "/profile/balance" },
        { label: tProfile('wishlist'), value: statsData.wishlistCount.toString(), icon: Heart, color: "text-pink-600", bg: "bg-pink-50", href: "/favorites" },
    ];

    const mobileMenu = [
        { icon: MapPin, label: tProfile('my_addresses'), href: "/profile/addresses", color: "text-orange-500" },
        { icon: Bell, label: tProfile('notifications'), href: "/profile/notifications", color: "text-red-500" },
        { icon: Globe, label: tProfile('app_language'), href: "/profile/settings", color: "text-blue-500", value: tProfile(currentLocale) },
        { icon: Shield, label: tProfile('security'), href: "/profile/security", color: "text-green-500" },
        { icon: HelpCircle, label: tProfile('support'), href: "/support", color: "text-gray-500" },
    ];

    return (
        <div>
            {/* MOBILE VIEW */}
            <div className="lg:hidden flex flex-col gap-3">
                {/* 1. Compact User Header Card */}
                <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center text-blue-600 overflow-hidden shrink-0 border border-blue-100 shadow-sm transition-transform active:scale-95">
                            {user?.image ? (
                                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={24} strokeWidth={1.5} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
                                    {user?.name || tProfile('user_default')}
                                </h2>
                                {user?.uniqueId && (
                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-tight">
                                        {user.uniqueId}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] font-medium text-gray-500 truncate opacity-70">{user?.phone || user?.email || "---"}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Link href="/profile/info" className="p-2.5 bg-blue-50 rounded-xl text-blue-600 hover:bg-blue-100 active:scale-90 transition-all border border-blue-100/50">
                                <User size={20} strokeWidth={2} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 2. Compact Order Status Bar */}
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                            <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">{tProfile('order_history')}</h3>
                        </div>
                        <Link href="/profile/orders" className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all active:scale-95">
                            {tProfile('view_all')}
                            <ChevronRight size={12} strokeWidth={3} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { count: statsData.ordersByStatus.pending, icon: Clock, color: "text-orange-500", bg: "bg-orange-50", label: tProfile('pending') },
                            { count: statsData.ordersByStatus.processing, icon: Package, color: "text-blue-500", bg: "bg-blue-50", label: tProfile('processing') },
                            { count: statsData.ordersByStatus.delivered, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", label: tProfile('delivered') },
                            { count: statsData.ordersByStatus.cancelled, icon: LogOut, color: "text-rose-500", bg: "bg-rose-50", label: tProfile('cancelled') }
                        ].map((item, idx) => (
                            <Link key={idx} href="/profile/orders" className="flex flex-col items-center justify-center gap-1.5 transition-all active:scale-90">
                                <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shadow-sm border border-white/50 relative`}>
                                    <item.icon size={18} strokeWidth={2.2} />
                                    {item.count > 0 && (
                                        <span className={`absolute -top-1 -right-1 w-4.5 h-4.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm border-2 border-white ${item.color.replace('text-', 'bg-')}`}>
                                            {item.count}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[9px] font-bold text-gray-500 text-center uppercase tracking-tight opacity-70">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* 3. Compact Menu List */}
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden py-1.5 px-1.5">
                    {mobileMenu.map((item: any, index: number) => {
                        const isAction = !!item.action;
                        const LinkComponent = item.href === '/admin' ? NextLink : Link;
                        const content = (
                            <>
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 ${item.color} group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-active:scale-90`}>
                                    <item.icon size={18} strokeWidth={2} />
                                </div>
                                <span className="flex-1 font-bold text-gray-700 text-sm group-hover:text-gray-900">{item.label}</span>
                                <div className="flex items-center gap-2">
                                    {item.value && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tight">{item.value}</span>}
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <ChevronRight size={16} strokeWidth={2.5} className="text-gray-300 group-hover:text-blue-600" />
                                    </div>
                                </div>
                            </>
                        );

                        const className = "group w-full flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent active:bg-blue-50/30 mb-0.5 last:mb-0";

                        return isAction ? (
                            <button key={index} onClick={item.action} className={className}>{content}</button>
                        ) : (
                            <LinkComponent key={index} href={item.href || '#'} className={className}>{content}</LinkComponent>
                        );
                    })}
                </div>

                {/* 4. Compact Logout */}
                <button
                    onClick={() => signOut()}
                    className="group w-full bg-rose-50/50 p-3.5 rounded-[1.25rem] border border-rose-100/30 flex items-center justify-center gap-2.5 text-rose-500 text-sm font-bold hover:bg-rose-50 active:scale-[0.98] transition-all mb-4"
                >
                    <div className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center text-white group-hover:rotate-12 transition-transform shadow-lg shadow-rose-500/20">
                        <LogOut size={14} strokeWidth={3} />
                    </div>
                    {tProfile('logout').toUpperCase()}
                </button>
            </div>


            {/* DESKTOP VIEW - Modern Bento Grid Design */}
            <div className="hidden lg:block space-y-8">
                {/* 1. Header Section with Glass Effect */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-10 text-white shadow-xl">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-full border-4 border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-inner">
                                {user?.image ? (
                                    <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={48} className="text-white/80" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-2">
                                    {tProfile('good_day')}, {user?.name?.split(' ')[0] || tProfile('user_default')}!
                                </h1>
                                <div className="flex items-center gap-3">
                                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-medium border border-white/10 flex items-center gap-2">
                                        <Wallet size={14} />
                                        {tProfile('balance')}: {statsData.balance.toLocaleString()} {tHeader('som')}
                                    </span>
                                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-medium border border-white/10">
                                        ID: {user?.uniqueId || '---'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {hasPanelAccess && (
                                <NextLink href="/admin" className="px-5 py-3 bg-white text-blue-700 hover:bg-gray-50 rounded-xl transition-all shadow-lg flex items-center gap-2 font-bold ring-2 ring-white/50">
                                    <LayoutDashboard size={20} />
                                    {isAdmin ? tProfile('admin_panel') : "Sotuvchi paneli"}
                                </NextLink>
                            )}
                            <Link href="/profile/settings" className="px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl transition-all shadow-lg flex items-center gap-2 font-medium">
                                <Settings size={20} />
                                {tProfile('settings')}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 2. Main Stats Grid (Bento Style) */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Orders Card (Large) */}
                    <Link href="/profile/orders" className="col-span-8 bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <Package size={20} />
                                </div>
                                {tProfile('my_orders')}
                            </h2>
                            <div className="bg-gray-50 px-3 py-1 rounded-full text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {tProfile('all')}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 relative z-10">
                            {[
                                { label: tProfile('pending'), count: statsData.ordersByStatus.pending, icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
                                { label: tProfile('processing'), count: statsData.ordersByStatus.processing, icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
                                { label: tProfile('delivered'), count: statsData.ordersByStatus.delivered, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
                                { label: tProfile('cancelled'), count: statsData.ordersByStatus.cancelled, icon: LogOut, color: "text-red-500", bg: "bg-red-50" }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 cursor-pointer border border-transparent hover:border-gray-200">
                                    <div className={`w-10 h-10 rounded-full ${item.bg} ${item.color} flex items-center justify-center mb-1`}>
                                        <item.icon size={18} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-2xl font-bold text-gray-800">{item.count}</span>
                                    <span className="text-[11px] font-medium text-gray-500 leading-tight">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </Link>

                    {/* Quick Stats Column */}
                    <div className="col-span-4 flex flex-col gap-6">
                        {/* Favorites */}
                        <Link href="/favorites" className="flex-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute bottom-0 right-0 w-24 h-24 bg-pink-50 rounded-full blur-xl -mr-5 -mb-5 group-hover:scale-125 transition-transform"></div>
                            <div className="flex justify-between items-start z-10">
                                <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl">
                                    <Heart size={24} fill="currentColor" className="opacity-20" />
                                </div>
                                <ArrowRight size={20} className="text-gray-300 group-hover:text-pink-500 transition-colors" />
                            </div>
                            <div className="z-10">
                                <p className="text-3xl font-bold text-gray-800 mb-1">{statsData.wishlistCount}</p>
                                <p className="text-sm font-medium text-gray-500">{tProfile('wishlist')}</p>
                            </div>
                        </Link>

                        {/* Cashback/Balance */}
                        <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-3xl text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
                            <div className="flex justify-between items-start z-10">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                            <div className="z-10">
                                <p className="text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">{tProfile('balance')}</p>
                                <p className="text-2xl font-bold">{statsData.balance.toLocaleString()} {tHeader('som')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Recent Activity (Clean Slate) & Security Row */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Recent Order Detail - Placeholder or Empty */}
                    <div className="col-span-8 bg-white p-7 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-800">{tProfile('recent_activity')}</h3>
                            <Link href="/profile/orders" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                {tProfile('view_all')}
                            </Link>
                        </div>
                        {/* Empty State for Recent Activity */}
                        <div className="bg-gray-50 rounded-2xl p-10 border border-gray-100 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-gray-300">
                                <Package size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">{tProfile('no_orders')}</p>
                        </div>
                    </div>

                    {/* Security Card */}
                    <Link href="/profile/security" className="col-span-4 bg-green-50 p-7 rounded-3xl border border-green-100 hover:border-green-200 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-green-200/50 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="p-3 bg-white text-green-600 rounded-2xl w-fit shadow-sm mb-4">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{tProfile('security')}</h3>
                                <p className="text-sm text-gray-600 leading-snug">
                                    {tProfile('account_secure')}
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
