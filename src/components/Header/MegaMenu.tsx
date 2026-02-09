import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './MegaMenu.module.css';
import { ChevronRight, Smartphone, Laptop, Home, Shirt, BookOpen, Car, Monitor, Package, UserCircle, ShoppingBag, Heart, LogOut, LayoutDashboard } from 'lucide-react';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';
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
    const router = useRouter();
    const [activeIdx, setActiveIdx] = useState(0);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { items, openCart } = useCartStore();
    const { wishlist } = useWishlist();
    const { openAuthModal } = useUserStore();
    const { data: session } = useSession();
    const user = session?.user;

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
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

    const handleCategoryClick = (cat: any, idx: number) => {
        if (window.innerWidth < 992) {
            close();
            router.push(`/category/${cat.slug}`);
        } else {
            setActiveIdx(idx);
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

    return (
        <>
            <div className={styles.overlay} onClick={close}></div>
            <div className={styles.megaMenu}>
                <div className="container">
                    {/* Mobile Navigation Header - Only show if mode is full */}


                    <div className={styles.menuGrid}>
                        {loading ? (
                            <div style={{ padding: '20px', color: '#666' }}>Yuklanmoqda...</div>
                        ) : categories.length === 0 ? (
                            <div style={{ padding: '20px', color: '#666' }}>Kategoriyalar mavjud emas.</div>
                        ) : (
                            <>
                                <div className={styles.leftCol}>
                                    {categories.map((cat, idx) => (
                                        <div
                                            key={cat.id}
                                            className={`${styles.catItem} ${activeIdx === idx ? styles.activeCat : ''}`}
                                            onMouseEnter={() => setActiveIdx(idx)}
                                            onClick={() => handleCategoryClick(cat, idx)}
                                            style={{
                                                '--cat-gradient': GRADIENTS[idx % GRADIENTS.length]
                                            } as React.CSSProperties}
                                        >
                                            <span className={styles.catName}>{cat.name}</span>

                                            {/* Mobile Image (Bottom Right) */}
                                            <div className={styles.mobileCatImage}>
                                                {cat.image ? (
                                                    <img src={cat.image} alt={cat.name} />
                                                ) : <div style={{ opacity: 0.5 }}>{getIcon(cat.slug || '')}</div>}
                                            </div>

                                            {/* Desktop Icon (original) */}
                                            <span className={styles.icon}>
                                                {cat.image ? (
                                                    <img src={cat.image} alt={cat.name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                                                ) : getIcon(cat.slug || '')}
                                            </span>

                                            <ChevronRight size={16} className={styles.arrow} />
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.rightCol}>
                                    {categories[activeIdx] && (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                                <h3 style={{ margin: 0 }}>{categories[activeIdx].name}</h3>
                                                <Link href={`/category/${categories[activeIdx].slug}`} className={styles.viewAllLink} onClick={close}>
                                                    Barchasini ko'rish
                                                </Link>
                                            </div>

                                            <div className={styles.subGrid}>
                                                {categories[activeIdx].children && categories[activeIdx].children.length > 0 ? (
                                                    categories[activeIdx].children.map((sub: any) => (
                                                        <div key={sub.id} className={styles.subGroup}>
                                                            <Link href={`/category/${sub.slug}`} className={styles.subTitle} onClick={close}>
                                                                {sub.name}
                                                            </Link>

                                                            <div className={styles.microList}>
                                                                {sub.children?.map((micro: any) => (
                                                                    <Link key={micro.id} href={`/category/${micro.slug}`} className={styles.microLink} onClick={close}>
                                                                        {micro.name}
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ color: '#888', fontSize: '14px', gridColumn: 'span 4' }}>
                                                        Ushbu bo'limda hozircha ichki kategoriyalar yo'q.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}


                                </div>
                            </>
                        )}
                    </div>
                </div >
            </div >
        </>
    );
}
