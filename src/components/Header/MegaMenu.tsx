// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import styles from './MegaMenu.module.css';
import { useScrollLock } from '@/hooks/useScrollLock';
import { ChevronRight, X, Smartphone, Laptop, Home, Shirt, BookOpen, Car, Monitor, Package, UserCircle, ShoppingBag, Heart, LogOut, LayoutDashboard } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useCartStore } from '@/store/useCartStore';
import { useWishlist } from '@/context/WishlistContext';
import { useUserStore } from '@/store/useUserStore';
import { useSession, signOut } from 'next-auth/react';

const GRADIENTS = [
    'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)', // Orange/Red
    'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)', // Purple/Pink
    'linear-gradient(135deg, #56AB2F 0%, #A8E063 100%)', // Green/Lime
    'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', // Blue/Purple
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)',
    'linear-gradient(135deg, #FCCB90 0%, #D57EEB 100%)',
    'linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)',
];

export default function MegaMenu({ isOpen, close, menuMode = 'full' }: { isOpen: boolean; close: () => void; menuMode?: 'full' | 'catalog' }) {
    const t = useTranslations('MegaMenu');
    const th = useTranslations('Header');
    const tAuth = useTranslations('Auth');
    const locale = useLocale();
    const router = useRouter();
    const [activeIdx, setActiveIdx] = useState(0);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Mobile drill-down: roots -> selected root children -> child page
    const [selectedRoot, setSelectedRoot] = useState<any | null>(null);

    const { items, openCart } = useCartStore();
    const { wishlist } = useWishlist();
    const { openAuthModal } = useUserStore();
    const { data: session } = useSession();
    const user = session?.user;

    // Menu ochiq paytida fon sahifa scroll qilinmaydi
    useScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) {
            // Use a microtask to avoid synchronous setState warning in Next.js/React 19
            queueMicrotask(() => setLoading(true));
            fetch('/api/categories')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setCategories(data);
                    }
                })
                .catch(err => console.error("Menu fetch error", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackToRoots = () => {
        setSelectedRoot(null);
        setActiveIdx(0);
    };

    // To'liq locale-prefixed kategoriya URL — native <a> bilan full navigation.
    // Telegram WebView'da router.push ishonchsiz bo'lgani uchun native anchor
    // ishlatiladi (garantiya qilingan navigatsiya).
    const catHref = (slug: string) => `/${locale}/category/${slug}`;

    // Mobile'da root kategoriya (children bor) bosilganda drill-down ochiladi;
    // boshqa holatlarda <a> native navigatsiya qiladi.
    const handleNavClick = (e: React.MouseEvent, cat: any) => {
        if (window.innerWidth < 992 && cat.children && cat.children.length > 0) {
            e.preventDefault();
            setSelectedRoot(cat);
            setActiveIdx(0);
        } else {
            // Desktop yoki child'siz root — native <a> navigation authoritative,
            // close() setTimeout bilan keyinga suriladi (anchor'ni DOM'dan olib
            // tashlash native navigation'ni bekor qilmasligi uchun).
            setTimeout(close, 0);
        }
    };

    const handleAuth = () => {
        close();
        if (!user) openAuthModal();
        else router.push('/profile');
    };

    const handleCart = () => {
        close();
        openCart();
    };

    // Helper to pick an icon based on slug or name, purely decorative fallbacks
    const getIcon = (slug: string) => {
        if (slug.includes('phone') || slug.includes('telefon')) return <Smartphone size={20} />;
        if (slug.includes('comp') || slug.includes('komp') || slug.includes('laptop')) return <Laptop size={20} />;
        if (slug.includes('appliance') || slug.includes('maishiy')) return <Home size={20} />;
        if (slug.includes('cloth') || slug.includes('kiyim')) return <Shirt size={20} />;
        if (slug.includes('book') || slug.includes('kitob')) return <BookOpen size={20} />;
        if (slug.includes('auto') || slug.includes('avto')) return <Car size={20} />;
        if (slug.includes('game') || slug.includes('oyin')) return <Monitor size={20} />;
        return <Package size={20} />;
    };

    // Keyboard navigation — ArrowDown/Up kategoriyalar orasida, Escape yopadi
    const handleKeyDown = (e: React.KeyboardEvent, idx: number, total: number) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIdx((idx + 1) % total);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIdx((idx - 1 + total) % total);
                break;
            case 'Escape':
                e.preventDefault();
                close();
                break;
        }
    };

    // Menu container — Escape bilan yopish
    const handleMenuKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    };

    return (
        <>
            <div className={styles.overlay} onClick={close}></div>
            <div id="catalog-menu" className={styles.megaMenu} onKeyDown={handleMenuKeyDown}>
                <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>{th('katalog')}</span>
                    <button
                        type="button"
                        className={styles.panelClose}
                        onClick={close}
                        aria-label={th('yopish')}
                    >
                        <X size={22} />
                    </button>
                </div>
                <div className={styles.menuGrid}>
                        {loading ? (
                            <div className={styles.statusMessage}>{t('loading')}</div>
                        ) : categories.length === 0 ? (
                            <div className={styles.statusMessage}>{t('no_categories')}</div>
                        ) : selectedRoot && window.innerWidth < 992 ? (
                            // Mobile drill-down: children view
                            <div className={styles.leftCol}>
                                <button
                                    type="button"
                                    className={styles.catItem}
                                    onClick={handleBackToRoots}
                                    style={{ fontStyle: 'italic', opacity: 0.7 }}
                                >
                                    <span className={styles.catName}>← {selectedRoot.name}</span>
                                </button>
                                <a
                                    href={catHref(selectedRoot.slug)}
                                    className={`${styles.catItem} ${styles.activeCat}`}
                                    style={{ color: 'var(--primary)', textDecoration: 'none' }}
                                >
                                    <span className={styles.catName}>{t('view_all')}</span>
                                </a>
                                {selectedRoot.children?.map((child: any) => (
                                    <a
                                        key={child.id}
                                        href={catHref(child.slug)}
                                        className={styles.catItem}
                                        style={{ textDecoration: 'none' }}
                                        onClick={() => {
                                            // Native <a> navigation authoritative; close() keyinga suriladi
                                            setTimeout(close, 0);
                                        }}
                                    >
                                        <span className={styles.catName}>{child.name}</span>
                                        <ChevronRight size={16} className={styles.arrow} />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className={styles.leftCol} role="tablist" aria-label={th('katalog')}>
                                    {categories.map((cat, idx) => (
                                        <a
                                            key={cat.id}
                                            href={catHref(cat.slug)}
                                            className={`${styles.catItem} ${activeIdx === idx ? styles.activeCat : ''}`}
                                            onMouseEnter={() => setActiveIdx(idx)}
                                            onFocus={() => setActiveIdx(idx)}
                                            onClick={(e) => handleNavClick(e, cat)}
                                            role="tab"
                                            aria-selected={activeIdx === idx}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <span className={styles.catName}>{cat.name}</span>

                                            {/* Mobile Image (Bottom Right) */}
                                            <div className={styles.mobileCatImage}>
                                                {cat.image ? (
                                                    <img src={cat.image} alt={cat.name} />
                                                ) : <div className={styles.fallbackIcon}>{getIcon(cat.slug || '')}</div>}
                                            </div>

                                            {/* Desktop Icon (original) */}
                                            <span className={styles.icon}>
                                                {cat.image ? (
                                                    <img src={cat.image} alt={cat.name} />
                                                ) : getIcon(cat.slug || '')}
                                            </span>

                                            <ChevronRight size={16} className={styles.arrow} />
                                        </a>
                                    ))}
                                </div>
                                <div className={styles.rightCol}>
                                    {categories[activeIdx] && (
                                        <>
                                            <div className={styles.rightColHeader}>
                                                <h3>{categories[activeIdx].name}</h3>
                                                {/* "Barchasini ko'rish" — kichik secondary text-link */}
                                                <a
                                                    href={catHref(categories[activeIdx].slug)}
                                                    className={styles.viewAllLink}
                                                    style={{ textDecoration: 'none' }}
                                                    onClick={() => {
                                                        setTimeout(close, 0);
                                                    }}
                                                >
                                                    {t('view_all')}
                                                </a>
                                            </div>

                                            {/* Child kategoriyalar — toza grid */}
                                            <div className={styles.childGrid}>
                                                {categories[activeIdx].children && categories[activeIdx].children.length > 0 ? (
                                                    categories[activeIdx].children.map((sub: any) => (
                                                    <a
                                                        key={sub.id}
                                                        href={catHref(sub.slug)}
                                                        className={styles.childLink}
                                                        style={{ textDecoration: 'none' }}
                                                        onClick={() => {
                                                            // Native <a> navigation authoritative — browser href'ni o'zi
                                                            // ochadi. `close()` ni setTimeout bilan keyinga surish anchor
                                                            // DOM'dan olib tashlansa ham native navigation bekor
                                                            // bo'lmasligini ta'minlaydi (avvalgi /uz redirect sababi).
                                                            setTimeout(close, 0);
                                                        }}
                                                    >
                                                        {sub.name}
                                                    </a>
                                                    ))
                                                ) : (
                                                    <div className={styles.noSubCategories}>{t('no_subcategories')}</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
        </>
    );
}
