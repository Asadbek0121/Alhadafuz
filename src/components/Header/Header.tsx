"use client";

import { useState, useEffect, useRef } from 'react';
import { Link } from '@/navigation';
import { useRouter } from '@/navigation';
import {
    LayoutGrid, Search, ShoppingBag, Heart, UserCircle, Bell, Globe, X, Check,
    Package, Tag, Info, LogOut, LayoutDashboard, Scale, Menu
} from 'lucide-react';
import styles from './Header.module.css';
import { useCartStore } from '@/store/useCartStore';
import { useWishlist } from '@/context/WishlistContext';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/useUserStore';
import { useSession } from 'next-auth/react';
import CartDrawer from '../Cart/CartDrawer';
import AuthModal from '../Auth/AuthModal';
import MegaMenu from './MegaMenu';
import LanguageSwitcher from '../LanguageSwitcher';

export default function Header() {
    const { items, openCart } = useCartStore();
    const { wishlist } = useWishlist();
    const t = useTranslations('Header');

    const { openAuthModal, user: storeUser } = useUserStore();
    const { data: session, status } = useSession();
    const isAuthenticated = status === "authenticated";
    // Prefer storeUser for real-time updates (e.g. settings changes), fallback to session user
    const user = storeUser || session?.user;

    const router = useRouter();

    const [notifOpen, setNotifOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuMode, setMenuMode] = useState<'full' | 'catalog'>('full');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Notification State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);



    // Fetch notifications function
    const fetchNotifications = () => {
        const isEnabled = (user as any)?.notificationsEnabled !== false;
        if (isAuthenticated && isEnabled) {
            fetch('/api/user/notifications')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setNotifications(data);
                        setUnreadCount(data.filter((n: any) => !n.isRead).length);
                    }
                })
                .catch(err => console.error("Failed to load notifications", err));
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const handleNotifUpdate = () => fetchNotifications();
        window.addEventListener('notifications-updated', handleNotifUpdate);

        return () => window.removeEventListener('notifications-updated', handleNotifUpdate);
    }, [isAuthenticated, (user as any)?.notificationsEnabled]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchResults([]);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            <header className={styles.header}>
                <div className={`container ${styles.headerInner}`}>

                    {/* Mobile Top Row */}
                    <div className={styles.mobileTopRow}>
                        {/* Mobile Menu Button Removed */}

                        <Link href="/" className={styles.logoMobile}>
                            <span style={{ color: 'var(--primary)' }}>Hadaf</span>Market
                        </Link>

                        <div className={styles.mobileActions} style={{ display: 'none' }}>
                            <Link
                                href="/profile"
                                className={styles.actionItem}
                                onClick={handleProfileClick}
                            >
                                {user?.image ? (
                                    <img src={user.image} alt={user.name || "User"} className={styles.userAvatar} />
                                ) : (
                                    <UserCircle size={26} strokeWidth={2.0} />
                                )}
                            </Link>
                        </div>
                    </div>

                    {/* Desktop specific elements */}
                    <Link href="/" className={`${styles.logo} ${styles.desktopOnly}`}>
                        <span style={{ color: 'var(--primary)' }}>Hadaf</span>Market
                    </Link>

                    <button
                        id="category-btn-trigger"
                        className={`${styles.categoryBtn} ${menuOpen ? styles.activeMenuBtn : ''} ${styles.desktopOnly}`}
                        onClick={() => { setMenuMode('catalog'); setMenuOpen(!menuOpen); }}
                    >
                        {menuOpen ? <X size={20} /> : <LayoutGrid size={20} />}
                        {t('katalog')}
                    </button>

                    <div className={styles.mobileSearchContainer}>
                        <div className={styles.searchBox} ref={searchRef}>
                            <input
                                type="text"
                                placeholder={t('search_placeholder')}
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            <button className={styles.searchBtn}>
                                <Search size={20} />
                            </button>

                            {searchQuery.length > 0 && (
                                <div className={styles.searchResults}>
                                    {searchResults.length > 0 ? (
                                        searchResults.map((product) => (
                                            <Link
                                                key={product.id}
                                                href={`/product/${product.id}`}
                                                className={styles.searchItem}
                                                onClick={() => {
                                                    setSearchResults([]);
                                                    setSearchQuery('');
                                                }}
                                            >
                                                <img src={product.image} alt={product.title} className={styles.searchItemImg} />
                                                <div className={styles.searchItemInfo}>
                                                    <div className={styles.searchItemTitle}>{product.title}</div>
                                                    <div className={styles.searchItemPrice}>{product.price.toLocaleString()} {t('som')}</div>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className={styles.searchEmpty}>
                                            {isSearching ? t('loading') : t('not_found')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.langWrapperMobile}>
                            <LanguageSwitcher minimal={true} />
                        </div>
                    </div>

                    <nav className={`${styles.actions} ${styles.desktopOnly}`} ref={dropdownRef}>
                        {/* Language - Apple Style Switcher */}
                        <div className={styles.actionItem} style={{ cursor: 'default' }}>
                            <LanguageSwitcher />
                        </div>



                        {/* Notifications */}
                        <div
                            className={styles.actionItem}
                            onClick={() => {
                                if (!notifOpen && unreadCount > 0) {
                                    // Mark all as read locally immediately for UI
                                    setUnreadCount(0);
                                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

                                    // Sync with server
                                    fetch('/api/user/notifications', { method: 'PUT' })
                                        .catch(err => console.error("Failed to mark read", err));
                                }
                                setNotifOpen(!notifOpen);
                            }}
                        >
                            <div className={styles.iconWrapper}>
                                <Bell size={22} strokeWidth={2.5} />
                                {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                            </div>
                            <span className={styles.actionLabel}>{t('bildirishnoma')}</span>
                            {notifOpen && (
                                <div className={styles.dropdown}>
                                    <div className={styles.dropdownHeader}>
                                        <span>{t('bildirishnoma')}</span>
                                        <Link href="/profile/notifications" className={styles.markRead} style={{ fontSize: '11px', textDecoration: 'underline' }}>
                                            {t('bildirishnomalarni_boshqarish')}
                                        </Link>
                                    </div>
                                    <div className={styles.dropdownContent}>
                                        {notifications.length === 0 ? (
                                            <div className={styles.notifItem} style={{ justifyContent: 'center', opacity: 0.6 }}>
                                                {t('empty_notif') || "Bildirishnomalar yo'q"}
                                            </div>
                                        ) : (
                                            notifications.map(notif => (
                                                <div key={notif.id} className={styles.notifItem}>
                                                    <div className={`${styles.notifIcon} ${styles.order}`}>
                                                        <Info size={18} />
                                                    </div>
                                                    <div className={styles.notifInfo}>
                                                        <div className={styles.notifTitle}>{notif.title}</div>
                                                        <div className={styles.notifDesc}>{notif.message}</div>
                                                        <div className={styles.notifTime} suppressHydrationWarning>
                                                            {new Date(notif.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Favorites */}
                        <Link href="/favorites" className={styles.actionItem}>
                            <div className={styles.iconWrapper}>
                                <Heart size={22} strokeWidth={2.5} />
                                {wishlist.length > 0 && <span className={styles.badge}>{wishlist.length}</span>}
                            </div>
                            <span className={styles.actionLabel}>{t('sevimlilar')}</span>
                        </Link>

                        {/* Cart */}
                        <div className={styles.actionItem} onClick={openCart}>
                            <div className={styles.iconWrapper}>
                                <ShoppingBag size={22} strokeWidth={2.5} />
                                {items.length > 0 && <span className={styles.badge}>{items.length}</span>}
                            </div>
                            <span className={styles.actionLabel}>{t('savatcha')}</span>
                        </div>

                        {/* Profile - Optimized for One-Click Access */}
                        <Link
                            href="/profile"
                            className={styles.actionItem}
                            onClick={handleProfileClick}
                        >
                            {user?.image ? (
                                <img src={user.image} alt={user.name || "User"} className={styles.userAvatar} />
                            ) : (
                                <UserCircle size={28} strokeWidth={2.0} />
                            )}
                            <span className={styles.actionLabel}>
                                {status === "loading" ? "..." : (isAuthenticated ? (user?.name?.split(' ')[0] || user?.email) : t('kirish'))}
                            </span>
                        </Link>
                    </nav>
                </div>
            </header>
            <MegaMenu isOpen={menuOpen} close={() => setMenuOpen(false)} menuMode={menuMode} />
            <CartDrawer />
            <AuthModal />
        </>
    );
}
