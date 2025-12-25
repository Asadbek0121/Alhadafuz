"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from './ProductCard.module.css';
import { ShoppingBag, Heart, Scale, Star, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore'; // Updated import
import { useTranslations } from 'next-intl';
import { useWishlist } from '@/context/WishlistContext';
import { useState } from 'react';
import { toast } from 'sonner';

interface ProductProps {
    id: string; // Updated to string
    title: string;
    price: number;
    oldPrice?: number;
    isSale?: boolean;
    image: string;
}

export default function ProductCard(props: ProductProps) {
    const { id, title, price, oldPrice, isSale, image } = props;
    const { addToCart } = useCartStore(); // Updated hook
    const t = useTranslations('Header');
    const { toggleWishlist, isInWishlist } = useWishlist();
    const router = useRouter();
    const [isBuying, setIsBuying] = useState(false);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        addToCart({ id, title, price, image }, false); // Don't open drawer
        toast.success(title + ' - ' + t('savatcha'));
    };

    const handleBuyNow = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsBuying(true);
        addToCart({ id, title, price, image }, false); // Don't open drawer
        router.push('/checkout');
    };

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(id);
    };

    const activeWishlist = isInWishlist(id);

    return (
        <Link href={`/product/${id}`} className={styles.card}>
            <div className={styles.badges}>
                {isSale && <span className={`${styles.badge} ${styles.badgeSale}`}>-20%</span>}
                <span className={`${styles.badge} ${styles.badgeGreen}`}>Yangi</span>
            </div>

            <div className={styles.actionsHover} onClick={(e) => e.preventDefault()}>
                <button
                    className={`${styles.actionBtn} ${activeWishlist ? styles.activeAction : ''}`}
                    onClick={handleToggleWishlist}
                    aria-label={t('sevimlilar')}
                >
                    <Heart size={18} fill={activeWishlist ? "var(--primary)" : "none"} color={activeWishlist ? "var(--primary)" : "currentColor"} />
                </button>

            </div>

            <div className={styles.imageWrapper}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', background: '#fff', borderRadius: '8px' }}>
                    <img
                        src={image}
                        alt={title}
                        className={styles.image}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                </div>
            </div>

            <div className={styles.content}>
                <h3 className={styles.title}>{title}</h3>
                <div className={styles.rating}>
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill={i < 5 ? "#ffc107" : "#e0e0e0"} stroke="none" />)}
                    <span className={styles.reviews}>(5)</span>
                </div>

                <div className={styles.priceBlock}>
                    {oldPrice ? <div className={styles.oldPrice}>{oldPrice.toLocaleString()} {t('som')}</div> : <div style={{ height: '18px' }}></div>}
                    <div className={styles.price}>{price.toLocaleString()} {t('som')}</div>
                </div>

                <div className={styles.bottomActions} onClick={(e) => e.preventDefault()}>
                    <button className={styles.btnBuy} onClick={handleBuyNow} disabled={isBuying}>
                        {isBuying ? <Loader2 size={16} className="animate-spin" /> : t('sotib_olish')}
                    </button>
                    <button className={styles.btnCart} aria-label="Savatga qo'shish" onClick={handleAddToCart}>
                        <ShoppingBag size={20} />
                    </button>
                </div>
            </div>
        </Link>
    )
}
