"use client";

import { useUserStore } from "@/store/useUserStore";
import {
    Package, Wallet, Heart, ArrowRight, TrendingUp, Clock, CheckCircle2,
    MapPin, CreditCard, Globe, HelpCircle, LogOut, ChevronRight, Settings,
    User, Bell, Shield, LayoutDashboard
} from "lucide-react";
import { Link } from "@/navigation";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";

export default function ProfileOverviewPage() {
    const { user } = useUserStore();
    const tProfile = useTranslations('Profile');
    const { data: session } = useSession();

    // Check for admin role
    const isAdmin = (user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'ADMIN';

    // In a real app, these would come from an API
    // For now, we utilize empty states or simple 0s to avoid showing "fake" data
    const stats = [
        { label: tProfile('active_orders'), value: "0", icon: Package, color: "text-blue-600", bg: "bg-blue-50", href: "/profile/orders" },
        { label: tProfile('my_bonuses'), value: "0", icon: Wallet, color: "text-green-600", bg: "bg-green-50", href: "/profile/balance" },
        { label: tProfile('wishlist'), value: "0", icon: Heart, color: "text-pink-600", bg: "bg-pink-50", href: "/favorites" },
    ];

    const mobileMenu = [
        ...(isAdmin ? [{ icon: LayoutDashboard, label: "Admin Panel", href: "/admin", color: "text-purple-600", value: "" }] : []),
        { icon: MapPin, label: tProfile('my_addresses'), href: "/profile/addresses", color: "text-orange-500" },
        { icon: Bell, label: tProfile('notifications'), href: "/profile/notifications", color: "text-red-500" },
        { icon: Globe, label: tProfile('app_language'), href: "/profile/settings", color: "text-blue-500", value: "O'zbekcha" }, // Language is dynamic in settings
        { icon: Shield, label: tProfile('security'), href: "/profile/security", color: "text-green-500" },
        { icon: HelpCircle, label: tProfile('support'), href: "/support", color: "text-gray-500" },
    ];

    return (
        <div className="pb-24 md:pb-0">
            {/* MOBILE VIEW */}
            <div className="md:hidden flex flex-col gap-4">
                {/* User Header Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 overflow-hidden">
                        {user?.image ? (
                            <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={32} />
                        )}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">{user?.name || tProfile('user_default')}</h2>
                        <p className="text-sm text-gray-500">{user?.email || user?.phone || "---"}</p>
                        <p className="text-xs text-blue-500 font-bold mt-1 max-w-fit px-2 py-0.5 bg-blue-50 rounded-md">{tProfile('id')}: {user?.uniqueId || '---'}</p>
                    </div>
                    <Link href="/profile/settings" className="p-2 bg-gray-50 rounded-xl text-gray-600">
                        <Settings size={20} />
                    </Link>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/profile/orders" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center z-10">
                            <Package size={20} />
                        </div>
                        <div className="z-10">
                            <p className="text-2xl font-bold text-gray-900">0</p>
                            <p className="text-xs font-medium text-gray-500">{tProfile('my_orders')}</p>
                        </div>
                    </Link>
                    <Link href="/favorites" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-pink-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center z-10">
                            <Heart size={20} />
                        </div>
                        <div className="z-10">
                            <p className="text-2xl font-bold text-gray-900">0</p>
                            <p className="text-xs font-medium text-gray-500">{tProfile('wishlist')}</p>
                        </div>
                    </Link>
                </div>

                {/* Menu List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden px-2">
                    {mobileMenu.map((item, index) => {
                        const LinkComponent = item.href === '/admin' ? NextLink : Link;
                        return (
                            <LinkComponent key={index} href={item.href} className="flex items-center gap-4 p-4 border-b last:border-0 border-gray-100 hover:bg-gray-50 transition-colors">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 ${item.color}`}>
                                    <item.icon size={20} />
                                </div>
                                <div className="flex-1 flex items-center justify-between">
                                    <span className="font-medium text-gray-800">{item.label}</span>
                                    <div className="flex items-center gap-2">
                                        {item.value && <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{item.value}</span>}
                                        <ChevronRight size={18} className="text-gray-300" />
                                    </div>
                                </div>
                            </LinkComponent>
                        );
                    })}
                </div>

                {/* Logout Button */}
                <button
                    onClick={() => signOut()}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-50 transition-colors"
                >
                    <LogOut size={20} />
                    {tProfile('logout')}
                </button>
            </div>


            {/* DESKTOP VIEW - Modern Bento Grid Design */}
            <div className="hidden md:block space-y-8">
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
                                        {tProfile('balance')}: 0 {tProfile('sum', { currency: "so'm" })}
                                    </span>
                                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-medium border border-white/10">
                                        ID: {user?.uniqueId || '---'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {isAdmin && (
                                <NextLink href="/admin" className="px-5 py-3 bg-white text-blue-700 hover:bg-gray-50 rounded-xl transition-all shadow-lg flex items-center gap-2 font-bold ring-2 ring-white/50">
                                    <LayoutDashboard size={20} />
                                    Admin Panel
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
                                { label: tProfile('pending'), count: 0, icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
                                { label: tProfile('processing'), count: 0, icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
                                { label: tProfile('delivered'), count: 0, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
                                { label: tProfile('cancelled'), count: 0, icon: LogOut, color: "text-red-500", bg: "bg-red-50" }
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
                                <p className="text-3xl font-bold text-gray-800 mb-1">0</p>
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
                                <p className="text-2xl font-bold">0 so'm</p>
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
