"use client";

import { usePathname } from 'next/navigation';
import { Link } from '@/navigation';
import { House, LayoutGrid, ShoppingBag, Heart, UserCircle } from 'lucide-react';
import styles from './BottomNav.module.css';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/store/useCartStore';
import { useUserStore } from '@/store/useUserStore';
import { useSession } from 'next-auth/react';

export default function BottomNav() {
    const pathname = usePathname();
    const t = useTranslations('Header');
    const { items } = useCartStore();
    const { openAuthModal } = useUserStore();
    const { status } = useSession();
    const isAuthenticated = status === "authenticated";

    // Helper to check active state
    const isActive = (path: string) => {
        if (path === '/') return pathname === '/' || pathname === '/uz' || pathname === '/ru';
        return pathname.includes(path);
    };

    const handleProfileClick = (e: React.MouseEvent) => {
        if (!isAuthenticated) {
            e.preventDefault();
            openAuthModal();
        }
    };

    // Hide on product detail pages to make room for sticky action bar
    if (pathname.includes('/product/')) return null;

    return (
        <div className={styles.bottomNav}>
            {/* Home */}
            <Link href="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
                <House size={24} strokeWidth={2.5} />
                <span>Bosh sahifa</span>
            </Link>

            {/* Catalog - Triggers Menu */}
            <button className={`${styles.navItem}`} onClick={() => document.getElementById('category-btn-trigger')?.click()}>
                <LayoutGrid size={24} strokeWidth={2.5} />
                <span>{t('katalog')}</span>
            </button>

            {/* Cart */}
            <Link href="/cart" className={`${styles.navItem} ${isActive('/cart') ? styles.active : ''}`}>
                <div style={{ position: 'relative' }}>
                    <ShoppingBag size={24} strokeWidth={2.5} />
                    {items.length > 0 && (
                        <span style={{
                            position: 'absolute', top: -5, right: -8,
                            background: '#ff6b00', color: 'white',
                            fontSize: '10px', borderRadius: '50%',
                            width: '16px', height: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {items.length}
                        </span>
                    )}
                </div>
                <span>{t('savatcha')}</span>
            </Link>

            {/* Favorites */}
            <Link href="/favorites" className={`${styles.navItem} ${isActive('/favorites') ? styles.active : ''}`}>
                <Heart size={24} strokeWidth={2.5} />
                <span>{t('sevimlilar')}</span>
            </Link>

            {/* Profile */}
            <Link
                href="/profile"
                className={`${styles.navItem} ${isActive('/profile') ? styles.active : ''}`}
                onClick={handleProfileClick}
            >
                <UserCircle size={24} strokeWidth={2.5} />
                <span>Kabinet</span>
            </Link>
        </div>
    );
}
