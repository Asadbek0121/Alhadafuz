"use client";

import { useState, useEffect, useRef } from 'react';
import { Link } from '@/navigation';
import { useRouter } from '@/navigation';
import {
    LayoutGrid, Search, ShoppingBag, Heart, UserCircle, Bell, Globe, X, Check,
    Package, Tag, Info, LogOut, LayoutDashboard, Scale, Menu, Sun, Moon
} from 'lucide-react';
import styles from './Header.module.css';
import { useCartStore } from '@/store/useCartStore';
import { useWishlist } from '@/context/WishlistContext';
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ weight: ["700", "900"], subsets: ["latin"] });

import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/useUserStore';
import { useSession } from 'next-auth/react';
import CartDrawer from '../Cart/CartDrawer';
import AuthModal from '../Auth/AuthModal';
import MegaMenu from './MegaMenu';
import { useUIStore } from '@/store/useUIStore';
import LanguageSwitcher from '../LanguageSwitcher';


export default function Header() {
    const { items, openCart } = useCartStore();
    const { wishlist } = useWishlist();
    const t = useTranslations('Header');
    const tProfile = useTranslations('Profile');
    const tNotif = useTranslations('Notifications');

    const { openAuthModal, user: storeUser, setUser, logout } = useUserStore();
    const { data: session, status } = useSession();

    const isAuthenticated = status === "authenticated";

    // Sync store user with session user to prevent stale data (especially from persistence)
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            // Only update if storeUser is out of sync or missing
            if (!storeUser || storeUser.email !== session.user.email) {
                // Here we might want to fetch full user data, but for now just sync session
                setUser(session.user as any);
            }
        } else if (status === "unauthenticated" && storeUser) {
            logout();
        }
    }, [session, status, storeUser, setUser, logout]);

    // Use session user as primary source of truth for authentication state,
    // and storeUser only as a fallback for real-time UI updates when authenticated.
    const user = isAuthenticated ? (storeUser || session?.user) : null;

    const router = useRouter();

    const [notifOpen, setNotifOpen] = useState(false);
    // const [menuOpen, setMenuOpen] = useState(false); // Replaced by global store
    const { isCatalogOpen, toggleCatalog, closeCatalog } = useUIStore();

    const [menuMode, setMenuMode] = useState<'full' | 'catalog'>('full');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Notification State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (isAuthenticated) {
                try {
                    const res = await fetch('/api/user/notifications', {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        cache: 'no-store'
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setNotifications(data);
                        setUnreadCount(data.filter((n: any) => !n.isRead).length);
                    } else {
                        console.warn("Failed to fetch notifications:", res.status, res.statusText);
                    }
                } catch (e) {
                    // Start quiet logging for network errors
                    console.warn("Notification fetch error (likely network or server down):", e);
                }
            }
        };

        fetchNotifications();
        // Poll every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // I'll add this logic back, it's safer than leaving it broken.

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchResults([]);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setNotifOpen(false);
            }
        };

        const handleCloseMenu = () => closeCatalog();

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("close-catalog-menu", handleCloseMenu);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("close-catalog-menu", handleCloseMenu);
        };
    }, [closeCatalog]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length > 1) {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/products?q=${query}`);
                const data = await res.json();
                setSearchResults(data);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleProfileClick = (e: React.MouseEvent) => {
        if (!isAuthenticated) {
            e.preventDefault();
            openAuthModal();
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300">
                <div className="container h-24 lg:h-28 flex items-center justify-between gap-4 lg:gap-8">

                    {/* Left Section: Logo & Catalog */}
                    <div className="flex items-center gap-4 lg:gap-8">
                        {/* Mobile Menu Toggle Removed */}

                        <Link href="/" className="flex items-center shrink-0 group gap-0 -ml-4 lg:-ml-8">
                            <img src="/logo.png" alt="Hadaf Logo" className="h-[75px] lg:h-[115px] w-auto object-contain transition-transform group-hover:scale-105" />
                            <span className={`${montserrat.className} text-4xl lg:text-[48px] font-black tracking-tighter leading-none text-[#0052FF] -ml-2 lg:-ml-4 pt-1`}>Hadaf</span>
                        </Link>

                        <button
                            id="category-btn-trigger"
                            className={`hidden lg:flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${isCatalogOpen
                                ? 'bg-slate-900 text-white shadow-slate-900/20'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'
                                }`}
                            onClick={() => { setMenuMode('catalog'); toggleCatalog(); }}
                        >
                            {isCatalogOpen ? <X size={20} strokeWidth={2.5} /> : <LayoutGrid size={20} strokeWidth={2.5} />}
                            <span>{t('katalog')}</span>
                        </button>
                    </div>

                    {/* Center Section: Search Bar */}
                    <div className="hidden lg:block flex-1 relative" ref={searchRef}>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder={t('search_placeholder')}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-5 py-3 pr-14 rounded-2xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 transition-all font-medium"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                                <Search size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Search Dropdown */}
                        {searchQuery.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2 animate-fade-in-up">
                                {isSearching ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        {t('loading')}
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((product) => (
                                        <Link
                                            key={product.id}
                                            href={`/product/${product.id}`}
                                            className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                            onClick={() => { setSearchResults([]); setSearchQuery(''); }}
                                        >
                                            <img src={product.image} alt={product.title} className="w-12 h-12 object-contain rounded-lg bg-white p-1 border border-slate-100" />
                                            <div>
                                                <div className="font-medium text-slate-900 line-clamp-1">{product.title}</div>
                                                <div className="text-blue-600 font-bold text-sm">{product.price.toLocaleString()} {t('som')}</div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-slate-500">
                                        <Search size={24} className="mx-auto mb-2 opacity-50" />
                                        {t('not_found')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Section: Actions */}
                    <nav className="hidden lg:flex items-center gap-2 lg:gap-6" ref={dropdownRef}>
                        {/* Language Switcher */}
                        <div className="hidden md:block">
                            <LanguageSwitcher />
                        </div>



                        {/* Notifications */}
                        <div
                            className="relative group hidden md:flex flex-col items-center gap-1 cursor-pointer"
                            onClick={() => {
                                if (!notifOpen && unreadCount > 0) {
                                    setUnreadCount(0);
                                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                                    fetch('/api/user/notifications', { method: 'PUT' }).catch(console.error);
                                }
                                setNotifOpen(!notifOpen);
                            }}
                        >
                            <div className="relative p-2 rounded-xl group-hover:bg-slate-50 text-slate-600 group-hover:text-blue-600 transition-all">
                                <Bell size={24} strokeWidth={2} />
                                {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{unreadCount}</span>}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{t('bildirishnoma')}</span>

                            {/* Notification Dropdown */}
                            {notifOpen && (
                                <div className="absolute top-full right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[60] origin-top-right animate-scale-in">
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <span className="font-bold text-slate-900">{t('bildirishnoma')}</span>
                                        <Link href="/profile/notifications" className="text-xs text-blue-600 font-medium hover:underline">{t('bildirishnomalarni_boshqarish')}</Link>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto p-2">
                                        {notifications.map(notif => {
                                            const getLocalized = (n: any) => {
                                                let title = n.title;
                                                let message = n.message;

                                                if (title === "Buyurtma Holati" || title === "Buyurtma holati yangilandi") {
                                                    title = tNotif('order_status_title');
                                                    if (message.includes('raqamli buyurtmangiz holati:')) {
                                                        const idMatch = message.match(/#([A-Z0-9]+)/i);
                                                        const id = idMatch ? idMatch[1].toUpperCase() : '';
                                                        const statusPart = message.split(': ')[1];
                                                        const uzStatuses: any = {
                                                            'Buyurtmangiz qabul qilindi va kutilmoqda.': 'pending',
                                                            'Buyurtmangiz tasdiqlandi va tayyorlanmoqda.': 'processing',
                                                            'Buyurtmangiz yo\'lga chiqdi va tez orada yetkaziladi.': 'shipping',
                                                            'Buyurtmangiz muvaffaqiyatli yetkazib berildi. Xaridingiz uchun rahmat!': 'delivered',
                                                            'Buyurtmangiz bekor qilindi.': 'cancelled'
                                                        };
                                                        const status = uzStatuses[statusPart] ? tProfile(uzStatuses[statusPart]) : statusPart;
                                                        message = tNotif('order_status_msg', { id, status });
                                                    }
                                                } else if (title === "Yangi Buyurtma") {
                                                    title = tNotif('new_order_title');
                                                    if (message.includes('qabul qilindi. Summa:')) {
                                                        const idMatch = message.match(/#([A-Z0-9]+)/i);
                                                        const id = idMatch ? idMatch[1].toUpperCase() : '';
                                                        const totalVal = message.split('Summa: ')[1]?.replace(/so'm|сум|UZS/i, '').trim();
                                                        message = tNotif('new_order_msg', { id, total: totalVal + ' ' + t('som') });
                                                    }
                                                } else if (title === "Yangi Foydalanuvchi") {
                                                    title = tNotif('new_user_title');
                                                    if (message.includes("ro'yxatdan o'tdi.")) {
                                                        const name = message.replace(" ro'yxatdan o'tdi.", "");
                                                        message = tNotif('new_user_msg', { name });
                                                    }
                                                }

                                                return { title, message };
                                            };

                                            const localized = getLocalized(notif);

                                            return (
                                                <div key={notif.id} className="p-3 mb-1 rounded-xl hover:bg-slate-50 transition-colors flex gap-3">
                                                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                                        <Info size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{localized.title}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{localized.message}</div>
                                                        <div className="text-[10px] text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {notifications.length === 0 && (
                                            <div className="py-8 text-center text-slate-400 text-sm">
                                                {t('empty_notif') || "Bildirishnomalar yo'q"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Favorites */}
                        <Link href="/favorites" className="relative group hidden md:flex flex-col items-center gap-1 cursor-pointer">
                            <div className="relative p-2 rounded-xl group-hover:bg-slate-50 text-slate-600 group-hover:text-red-500 transition-all">
                                <Heart size={24} strokeWidth={2} />
                                {wishlist.length > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{wishlist.length}</span>}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{t('sevimlilar')}</span>
                        </Link>

                        {/* Cart */}
                        <button onClick={openCart} className="relative group hidden md:flex flex-col items-center gap-1 cursor-pointer">
                            <div className="relative p-2 rounded-xl group-hover:bg-slate-50 text-slate-600 group-hover:text-emerald-600 transition-all">
                                <ShoppingBag size={24} strokeWidth={2} />
                                {items.length > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{items.length}</span>}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors hidden md:block">{t('savatcha')}</span>
                        </button>

                        {/* Admin Link (Direct /admin access without locale) */}


                        {/* Profile */}
                        <Link href="/profile" onClick={handleProfileClick} className="relative group hidden md:flex flex-col items-center gap-1 cursor-pointer">
                            <div className="relative p-2 rounded-xl group-hover:bg-slate-50 text-slate-600 group-hover:text-blue-600 transition-all">
                                {user?.image ? (
                                    <img src={user.image} alt={user.name || "User"} className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                    <UserCircle size={24} strokeWidth={2} />
                                )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors max-w-[80px] truncate">
                                {status === "loading" ? "..." : (isAuthenticated ? (user?.name?.split(' ')[0] || user?.email) : t('kirish'))}
                            </span>
                        </Link>
                    </nav>
                </div>

                {/* Mobile Search Bar (Only visible on mobile) */}
                <div className="lg:hidden container pb-3 flex items-center gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder={t('search_placeholder')}
                            className="w-full bg-slate-100 border-none px-4 py-2.5 rounded-xl outline-none text-sm placeholder-slate-500"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
                            <Search size={18} />
                        </button>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                        <LanguageSwitcher minimal={true} />
                    </div>
                </div>
            </header>
            <MegaMenu isOpen={isCatalogOpen} close={closeCatalog} menuMode={menuMode} />
            <CartDrawer />
            <AuthModal />
        </>
    );
}
