"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useState, useEffect, useRef } from 'react';
import { Link } from '@/navigation';
import { useRouter, usePathname } from '@/navigation';
import NextLink from 'next/link';
import {
    Globe, X, Check,
    Package, Tag, Info, LogOut, LayoutDashboard, Scale, Menu, Sun, Moon,
    ChevronRight, Loader2
} from 'lucide-react';
import HeartIcon from '../icons/HeartIcon';
import CartIcon from '../icons/CartIcon';
import UserIcon from '../icons/UserIcon';
import NotificationIcon from '../icons/NotificationIcon';
import NotificationDrawer from '../NotificationDrawer';
import SearchIcon from '../icons/SearchIcon';
import CategoryIcon from '../icons/CategoryIcon';
import LocationIcon from '../icons/LocationIcon';
import styles from './Header.module.css';
import { useCartStore } from '@/store/useCartStore';
import { useLocationStore } from '@/store/useLocationStore';
import { useMapStore } from '@/store/useMapStore';
import { useWishlist } from '@/context/WishlistContext';
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ weight: ["700", "900"], subsets: ["latin"] });

import { useTranslations, useLocale } from 'next-intl';
import { useUserStore } from '@/store/useUserStore';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useUIStore } from '@/store/useUIStore';
import LanguageSwitcher from '../LanguageSwitcher';
import AnnouncementBar from './AnnouncementBar';

const CartDrawer = dynamic(() => import('../Cart/CartDrawer'), { ssr: false });
const MegaMenu = dynamic(() => import('./MegaMenu'), { ssr: false });



export default function Header({ firstRootSlug }: { firstRootSlug?: string | null }) {
    const { items, openCart, isHydrated } = useCartStore();
    const { wishlist } = useWishlist();
    const t = useTranslations('Header');
    const tProfile = useTranslations('Profile');
    const tNotif = useTranslations('Notifications');
    const locale = useLocale();

    const { openAuthModal, user: storeUser, setUser, logout } = useUserStore();
    const { address, city, district, setLocation, setLoading: setLocationLoading, isLoading: isLocationLoading } = useLocationStore();
    const { openMap } = useMapStore();
    const { data: session, status } = useSession();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Auto-detect location on load
    useEffect(() => {
        if (!isClient) return;
        // Only if location is not set
        if (!address && !city && !district) {
            const handleSuccess = (pos: GeolocationPosition) => {
                const { latitude, longitude } = pos.coords;
                // Fetch details
                fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.address) {
                            setLocation({
                                address: data.address,
                                city: data.city,
                                district: data.district,
                                lat: latitude,
                                lng: longitude
                            });
                        }
                    })
                    .catch(e => console.warn("Auto-geo error:", e));
            };

            const handleError = () => {
                // Fallback to IP
                fetch('https://ipapi.co/json/')
                    .then(res => res.json())
                    .then(data => {
                        if (data.latitude && data.longitude) {
                            setLocation({
                                address: data.city || "Unknown",
                                city: data.region,
                                district: data.city,
                                lat: data.latitude,
                                lng: data.longitude
                            });
                        }
                    })
                    .catch(() => { });
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    handleSuccess,
                    handleError,
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
                );
            } else {
                handleError();
            }
        }
    }, [isClient, address, city, district, setLocation]);

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
    const { activeMenu, toggleMenu, closeAllMenus, isCatalogOpen, toggleCatalog, closeCatalog } = useUIStore();

    const notifOpen = activeMenu === 'notifications';
    const [unreadCount, setUnreadCount] = useState(0);

    // Badge uchun o'qilmaganlar soni
    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;
        const fetchUnread = async () => {
            try {
                const res = await fetch('/api/user/notifications', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setUnreadCount(Array.isArray(data) ? data.filter((n: any) => !n.isRead).length : 0);
                }
            } catch (e) { /* quiet */ }
        };
        fetchUnread();
        const iv = setInterval(fetchUnread, 60000);
        return () => { cancelled = true; clearInterval(iv); };
    }, [isAuthenticated]);

    const [menuMode, setMenuMode] = useState<'full' | 'catalog'>('full');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const mobileSearchRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const searchAbortRef = useRef<AbortController | null>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    // Load recent searches from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('hadaf-recent-searches');
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch { /* ignore */ }
    }, []);

    // Save a recent search term
    const saveRecentSearch = (term: string) => {
        const trimmed = term.trim();
        if (!trimmed) return;
        setRecentSearches(prev => {
            const next = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, 5);
            try { localStorage.setItem('hadaf-recent-searches', JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    };




    // I'll add this logic back, it's safer than leaving it broken.

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            
            // Check if clicking inside elements that should keep menus open
            const isInsideSearch = searchRef.current?.contains(target) || mobileSearchRef.current?.contains(target);
            const isInsideDropdown = dropdownRef.current?.contains(target);
            const isCatalogBtn = target.closest('#category-btn-trigger');
            // MegaMenu ichidagi bosishlar menyuni yopmaydi — kategoriya tanlash uchun
            const isInsideCatalogMenu = target.closest('#catalog-menu') !== null;
            const isInsideNotificationDrawer = target.closest('[role="dialog"]') !== null;
            
            if (!isInsideSearch) setSearchResults([]);
            if (!isInsideDropdown && !isCatalogBtn && !isInsideCatalogMenu && !isInsideNotificationDrawer) closeAllMenus();
        };

        const handleCloseMenu = () => closeAllMenus();

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("close-catalog-menu", handleCloseMenu);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("close-catalog-menu", handleCloseMenu);
        };
    }, [closeCatalog]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setActiveIndex(-1);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        if (query.length > 1) {
            setIsSearching(true);
            searchDebounceRef.current = setTimeout(async () => {
                if (searchAbortRef.current) searchAbortRef.current.abort();
                const controller = new AbortController();
                searchAbortRef.current = controller;
                setSearchError(false);
                try {
                    const res = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=8`, {
                        signal: controller.signal,
                    });
                    const data = await res.json();
                    if (controller.signal.aborted) return;
                    // Handle both old format (array) and new format ({ products, total })
                    if (Array.isArray(data)) {
                        setSearchResults(data);
                    } else {
                        setSearchResults(data.products || []);
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') return;
                    console.error("Search error:", error);
                    setSearchError(true);
                } finally {
                    if (!controller.signal.aborted) setIsSearching(false);
                }
            }, 300);
        } else {
            setSearchResults([]);
            setIsSearching(false);
            setSearchError(false);
        }
    };

    const handleSearchSubmit = () => {
        const term = searchQuery.trim();
        if (term.length < 2) return;
        saveRecentSearch(term);
        setSearchResults([]);
        setSearchQuery('');
        router.push(`/search?q=${encodeURIComponent(term)}`);
    };

    const handleRecentSearchClick = (term: string) => {
        saveRecentSearch(term);
        setSearchResults([]);
        setSearchQuery('');
        router.push(`/search?q=${encodeURIComponent(term)}`);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && searchResults[activeIndex]) {
                handleSearchResultClick(searchResults[activeIndex]);
            } else {
                handleSearchSubmit();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const max = searchResults.length + recentSearches.length;
            setActiveIndex(prev => (prev < max - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Escape') {
            setSearchResults([]);
        }
    };

    const handleSearchResultClick = (product: any) => {
        saveRecentSearch(product.title);
        setSearchResults([]);
        setSearchQuery('');
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi");
            return;
        }

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
                    if (response.ok) {
                        const data = await response.json();
                        setLocation({
                            address: data.address,
                            city: data.city,
                            district: data.district,
                            lat: latitude,
                            lng: longitude
                        });
                    } else {
                        throw new Error("Geocoding failed");
                    }
                } catch (error) {
                    console.error("Geocoding error:", error);
                    alert("Manzilni aniqlashda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.");
                } finally {
                    setLocationLoading(false);
                }
            },
            (error) => {
                // Code 2 (Unavailable) and 3 (Timeout) are common on desktops, handle gracefully
                if (error.code === 2 || error.code === 3) {
                    console.warn(`Geolocation fallback triggered (Code ${error.code}): ${error.message}`);
                    getIPLocation();
                } else {
                    console.error("Geolocation error:", error.code, error.message);
                    setLocationLoading(false);
                    if (error.code === 1) { // PERMISSION_DENIED
                        alert("Joylashuvni aniqlash uchun ruxsat berilmadi. Iltimos, brauzer sozlamalarida ruxsat bering yoki xaritadan tanlang.");
                    } else {
                        alert("Joylashuvni aniqlashda noma'lum xatolik yuz berdi.");
                    }
                }
            },
            {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 60000
            }
        );
    };

    const getIPLocation = async () => {
        try {
            const response = await fetch('/api/geocode'); // Call without lat/lng to trigger IP logic
            if (response.ok) {
                const data = await response.json();
                setLocation({
                    address: data.address,
                    city: data.city,
                    district: data.district,
                    lat: data.lat,
                    lng: data.lng
                });
            } else {
                throw new Error("IP geocoding failed");
            }
        } catch (error) {
            console.error("IP Geocoding error:", error);
            if (confirm("Avtomatik aniqlash imkoni bo'lmadi. Xaritadan o'zingiz belgilashni xohlaysizmi?")) {
                openMap();
            }
        } finally {
            setLocationLoading(false);
        }
    };

    const handleProfileClick = (e: React.MouseEvent) => {
        if (!isAuthenticated) {
            e.preventDefault();
            openAuthModal();
        }
    };

    const pathname = usePathname();
    const isCheckoutPage = pathname === '/checkout';

    if (isCheckoutPage) return null;

    return (
        <>
            {/* Test rejim announcement — mobil/planshetda alohida row,
                desktopda quyidagi top bar ichida location'dan keyin */}
            <div className="xl:hidden">
                <AnnouncementBar />
            </div>

            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300">
                {/* Desktop Top Bar: location (fixed) + announcement (marquee) */}

                <div className="hidden xl:block w-full bg-slate-50 border-b border-slate-200 py-0 z-[51]">
                    <div className="w-full flex items-center">
                        {/* Location — container content edge bilan align (pl dinamik).
                            Container max-width 1400 (>=1440vw), 1280 (1280-1440), 100% (<1280).
                            pl = container left padding + margin. */}
                        <div
                            className="flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity w-[300px] flex-none h-[34px]"
                            style={{ paddingLeft: `max(24px, calc((100vw - 1400px) / 2 + 24px))` }}
                            onClick={openMap}
                        >
                            <div className="flex items-center justify-center text-blue-600 shrink-0">
                                {isLocationLoading ? <Loader2 size={12} className="animate-spin" /> : <LocationIcon size={14} />}
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-black text-slate-800 truncate leading-none border-b border-slate-300 border-dashed pb-0.5">
                                    {isClient && (city || district) ? [city, district].filter(Boolean).join(', ') : (isClient && address ? address : (t('joylashuvni_aniqlash') || "Joylashuvni aniqlash"))}
                                </span>
                            </div>
                        </div>

                        {/* Announcement marquee — qolgan kenglikni to'liq egallaydi,
                            o'ng cheti viewport chetigacha yetadi. */}
                        <div className="flex-1 min-w-0">
                            <AnnouncementBar />
                        </div>
                    </div>
                </div>

                <div className="container h-24 lg:h-28 flex items-center justify-between gap-4 lg:gap-8">

                    {/* Left Section: Logo & Catalog */}
                    <div className="flex items-center gap-4 lg:gap-8">
                        {/* Mobile Menu Toggle Removed */}

                        <Link href="/" className="flex items-center shrink-0 group gap-0 -ml-4 lg:-ml-8">
                            <img src="/logo.png" alt="Hadaf Logo" className="h-[75px] lg:h-[115px] w-auto object-contain transition-transform group-hover:scale-105" />
                            <div className="flex flex-col -ml-2 lg:-ml-4">
                                <span className={`${montserrat.className} text-3xl lg:text-[42px] font-black tracking-tighter leading-none text-[#0052FF] pt-1 uppercase`}>Hadaf</span>
                                <span className="text-[10px] lg:text-[12px] font-bold tracking-[0.2em] text-blue-500/80 uppercase mt-[-2px] lg:mt-[-4px] ml-0.5">Market</span>
                            </div>
                        </Link>

                        {/* Mobile/Tablet Location Selector (Visible < xl) */}
                        {/* Mobile/Tablet Location Selector (Visible < xl) */}
                        {/* Mobile/Tablet Location Selector (Visible < xl) */}


                        {/* Desktop Katalog — katta ikki ustunli panel ochadi (overlay).
                            Mobile'da BottomNav -> /category route'iga o'tadi. */}
                        <button
                            id="category-btn-trigger"
                            className={`hidden lg:flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${isCatalogOpen
                                ? 'bg-slate-900 text-white shadow-slate-900/20'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'
                                }`}
                            onClick={() => { setMenuMode('catalog'); toggleCatalog(); }}
                        >
                            {isCatalogOpen ? <X size={20} strokeWidth={2.5} /> : <CategoryIcon size={20} className="text-black" />}
                            <span>{t('katalog')}</span>
                        </button>
                    </div>

                    {/* Mobile/Tablet Location Selector (Visible < xl) - Moved to Right */}
                    <div
                        className="xl:hidden flex items-center justify-center h-10 cursor-pointer active:opacity-60 transition-opacity min-w-0 shrink"
                        onClick={openMap}
                    >
                        <LocationIcon size={16} className="shrink-0 mr-1.5" />
                        <div className="flex flex-col justify-center leading-tight min-w-0">
                            <span className="text-[10px] font-black text-slate-800 truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[140px] text-right">
                                {isClient && address ? address.replace(/^O['ʻ‘]zbekiston,?\s*/, '').split(',')[0] : (t('joylashuvni_aniqlash') || "Manzilni")}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[140px] text-right">
                                {isClient && address ? (address.replace(/^O['ʻ‘]zbekiston,?\s*/, '').split(',')[1] || "").trim() : (t('tanlash') || "Tanlash")}
                            </span>
                        </div>
                    </div>

                    {/* Center Section: Search Bar */}
                    <div className="hidden lg:block flex-1 relative" ref={searchRef}>
                        <div className="relative group">
                            <input
                                type="text"
                                name="search-input"
                                autoComplete="off"
                                placeholder={t('search_placeholder')}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-5 py-3 pr-14 rounded-2xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 transition-all font-medium"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                aria-label={t('search_placeholder')}
                                role="combobox"
                                aria-expanded={searchQuery.length > 1 || (isSearchFocused && recentSearches.length > 0)}
                                aria-haspopup="listbox"
                                aria-controls="search-dropdown"
                                aria-activedescendant={activeIndex >= 0 && searchResults[activeIndex] ? `search-option-${activeIndex}` : undefined}
                            />
                            <button
                                onClick={handleSearchSubmit}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600 transition-colors"
                                title={t('katalog')}
                                aria-label={t('search_placeholder')}
                            >
                                <SearchIcon size={22} />
                            </button>
                        </div>

                        {/* Search Dropdown */}
                        {(searchQuery.length > 0 || (isSearchFocused && recentSearches.length > 0)) && (
                            <div id="search-dropdown" ref={resultsContainerRef} className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2 animate-fade-in-up">
                                {searchQuery.length === 0 && recentSearches.length > 0 ? (
                                    <>
                                        <div className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400">{t('recent_searches')}</div>
                                        {recentSearches.map((term, idx) => (
                                            <button
                                                key={term}
                                                onClick={() => handleRecentSearchClick(term)}
                                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${activeIndex === idx ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                <SearchIcon size={14} className="text-slate-400" />
                                                {term}
                                            </button>
                                        ))}
                                    </>
                                ) : isSearching ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        {t('loading')}
                                    </div>
                                ) : searchError ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <SearchIcon size={24} className="mx-auto mb-2 opacity-50" />
                                        {t('not_found')}
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <>
                                        <div className="max-h-[50vh] overflow-y-auto" role="listbox" aria-label={t('search_placeholder')}>
                                            {searchResults.map((product, idx) => (
                                                <Link
                                                    key={product.id}
                                                    href={`/product/${product.slug || product.id}`}
                                                    role="option"
                                                    id={`search-option-${idx}`}
                                                    aria-selected={activeIndex === idx}
                                                    className={`flex items-center gap-4 px-4 py-3 transition-colors border-b border-slate-50 last:border-0 ${activeIndex === idx ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                                    onClick={() => handleSearchResultClick(product)}
                                                >
                                                    <img src={product.image} alt={product.title} className="w-12 h-12 object-contain rounded-lg bg-white p-1 border border-slate-100" />
                                                    <div>
                                                        <div className="font-medium text-slate-900 line-clamp-1">{product.title}</div>
                                                        <div className="text-blue-600 font-bold text-sm">{product.price.toLocaleString()} {t('som')}</div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleSearchSubmit}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                                        >
                                            {t('barchasini_korish')} "{searchQuery}"
                                        </button>
                                    </>
                                ) : (
                                    <div className="p-6 text-center text-slate-500">
                                        <SearchIcon size={24} className="mx-auto mb-2 opacity-50" />
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
                            onClick={() => toggleMenu('notifications')}
                        >
                            <div 
                                className="relative p-2 rounded-xl group-hover:bg-slate-50 text-slate-600 group-hover:text-blue-600 transition-all flex items-center justify-center w-10 h-10 cursor-pointer"
                            >
                                <NotificationIcon size={24} />
                                {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{unreadCount}</span>}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{t('bildirishnoma')}</span>

                            </div>

                        {/* Favorites */}
                        <Link href="/favorites" className="relative group hidden md:flex flex-col items-center gap-1 cursor-pointer">
                            <div className="relative p-2 rounded-xl group-hover:bg-slate-50 transition-all flex items-center justify-center w-10 h-10">
                                <HeartIcon size={24} className="opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                {wishlist.length > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{wishlist.length}</span>}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{t('sevimlilar')}</span>
                        </Link>

                        {/* Cart */}
                        <button onClick={openCart} className="relative group hidden md:flex flex-col items-center gap-1 cursor-pointer" title="Savatcha" aria-label="Savatchani ochish">
                            <div className="relative p-2 rounded-xl group-hover:bg-slate-50 transition-all flex items-center justify-center w-10 h-10">
                                <CartIcon size={24} className="opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                {isHydrated && items.length > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{items.length}</span>}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors hidden md:block">{t('savatcha')}</span>
                        </button>



                        {/* Profile */}
                        <Link href="/profile" onClick={handleProfileClick} className="relative group hidden md:flex flex-col items-center gap-1 cursor-pointer">
                            <div className="relative p-2 rounded-xl group-hover:bg-slate-50 transition-all flex items-center justify-center w-10 h-10">
                                {user?.image ? (
                                    <img src={user.image} alt={user.name || "User"} className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                    <UserIcon size={24} className="opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors max-w-[80px] truncate">
                                {status === "loading" ? "..." : (isAuthenticated ? (user?.name?.split(' ')[0] || user?.email) : t('kirish'))}
                            </span>
                        </Link>
                    </nav>
                </div>

                {/* Mobile Search & Location Bar (Only visible on mobile) */}
                <div className="lg:hidden container pb-3 flex flex-col gap-2 relative z-50">


                    <div className="flex items-center gap-2 relative z-[60]" ref={mobileSearchRef}>
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <SearchIcon size={16} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                            </div>
                            <input
                                type="text"
                                name="mobile-search-input"
                                autoComplete="off"
                                placeholder={t('search_placeholder')}
                                className="w-full bg-slate-100/80 border-2 border-transparent focus:border-blue-500/20 focus:bg-white px-10 py-2 rounded-2xl outline-none text-sm font-medium placeholder-slate-500 transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                aria-label={t('search_placeholder')}
                                role="combobox"
                                aria-expanded={searchQuery.length > 1}
                                aria-haspopup="listbox"
                                aria-controls="mobile-search-dropdown"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-200/50 rounded-full text-slate-500"
                                    title="Tozalash"
                                    aria-label="Qidiruv maydonini tozalash"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <div className="shrink-0">
                            <LanguageSwitcher minimal={true} />
                        </div>
                    </div>
                </div>

                {/* Mobile Search Dropdown */}
                {searchQuery.length > 0 && (
                    <div id="mobile-search-dropdown" className="absolute top-full left-4 right-4 mt-2 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden py-3 z-[70] animate-fade-in-up">
                        {isSearching ? (
                            <div className="p-10 text-center text-slate-500">
                                <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                <span className="text-sm font-medium">{t('loading')}</span>
                            </div>
                        ) : searchError ? (
                            <div className="p-10 text-center text-slate-500">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <SearchIcon size={28} className="opacity-20" />
                                </div>
                                <span className="text-sm font-semibold">{t('not_found')}</span>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="max-h-[60vh] overflow-y-auto px-2">
                                {searchResults.map((product, idx) => (
                                    <Link
                                        key={product.id}
                                        href={`/product/${product.slug || product.id}`}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all border-b border-slate-50 last:border-0 ${activeIndex === idx ? 'bg-blue-50' : 'hover:bg-slate-50 active:bg-slate-100/50'}`}
                                        onClick={() => handleSearchResultClick(product)}
                                    >
                                        <div className="shrink-0 w-12 h-12 rounded-xl bg-white border border-slate-100 p-1 flex items-center justify-center">
                                            <img src={product.image} alt={product.title} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-slate-900 line-clamp-1 text-[15px] mb-0.5">{product.title}</div>
                                            <div className="text-blue-600 font-black text-sm">{product.price.toLocaleString()} {t('som')}</div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300" />
                                    </Link>
                                ))}
                                <button
                                    onClick={handleSearchSubmit}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors"
                                >
                                    {t('barchasini_korish')} "{searchQuery}"
                                </button>
                            </div>
                        ) : (
                            <div className="p-10 text-center text-slate-500">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <SearchIcon size={28} className="opacity-20" />
                                </div>
                                <span className="text-sm font-semibold">{t('not_found')}</span>
                            </div>
                        )}
                    </div>
                )}
            </header>
            <MegaMenu isOpen={isCatalogOpen} close={closeCatalog} menuMode={menuMode} />
            <CartDrawer />
            <NotificationDrawer />
        </>


    );
}
