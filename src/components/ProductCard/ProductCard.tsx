"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from './ProductCard.module.css';
import { ShoppingBag, Heart, Scale, Star, Loader2, Truck, Play, Gift, AlertTriangle } from 'lucide-react';
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
    discountType?: string;
    isNew?: boolean;
    freeDelivery?: boolean;
    hasVideo?: boolean;
    hasGift?: boolean;
    showLowStock?: boolean;
    allowInstallment?: boolean;
    stock?: number;
}

export default function ProductCard(props: ProductProps) {
    const {
        id, title, price, oldPrice, isSale, image, discountType,
        isNew = true, freeDelivery, hasVideo, hasGift, showLowStock, allowInstallment, stock
    } = props;
    const { addToCart } = useCartStore(); // Updated hook
    const t = useTranslations('Header');
    const tMarketing = useTranslations('Marketing');
    const { toggleWishlist, isInWishlist } = useWishlist();
    const router = useRouter();
    const [isBuying, setIsBuying] = useState(false);

    const discountPercentage = oldPrice && price < oldPrice
        ? Math.round(((oldPrice - price) / oldPrice) * 100)
        : 0;

    const isLowStock = showLowStock && typeof stock !== 'undefined' && stock > 0 && stock < 10;
    const monthlyPayment = Math.round(price / 12);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        addToCart({
            id,
            title,
            price,
            image
        });
        toast.success(t('savatga_qoshildi'));
    };

    const handleBuyNow = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsBuying(true);
        addToCart({
            id,
            title,
            price,
            image
        });
        router.push(`/${window.location.pathname.split('/')[1]}/checkout`);
    };

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        toggleWishlist(id);
    };

    const activeWishlist = isInWishlist(id);

    return (
        <Link href={`/product/${id}`} className="group relative bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            {/* Top Left: Promotion Stickers */}
            <div className={styles.badgeContainer}>
                {(discountType && discountType !== 'no_discount') || (discountPercentage > 0 && !discountType) ? (
                    <div className={`${styles.promoSticker} ${discountType === 'HOT' ? styles.hotTheme :
                        discountType === 'PROMO' ? styles.promoTheme : styles.saleTheme
                        }`}>
                        {discountType === 'SALE' || !discountType ? tMarketing('sale') : tMarketing(discountType.toLowerCase())}
                    </div>
                ) : null}

                {isNew !== false && (
                    <div className={`${styles.promoSticker} ${styles.newTheme}`}>
                        {tMarketing('isNew')}
                    </div>
                )}

                {freeDelivery && (
                    <div className={`${styles.promoSticker} ${styles.deliveryTheme}`}>
                        <Truck size={12} className="mr-1" /> {tMarketing('bepul')}
                    </div>
                )}
                {hasGift && (
                    <div className={`${styles.promoSticker} ${styles.giftTheme}`}>
                        <Gift size={12} className="mr-1" /> {tMarketing('sovga')}
                    </div>
                )}
            </div>

            {/* Top Right: Discount Percentage Tag */}
            {discountPercentage > 0 && (
                <div className={styles.discountTag}>
                    <span>-{discountPercentage}%</span>
                    {tMarketing('chegirma')}
                </div>
            )}

            {/* Bottom Indicators (Video, stock) */}
            <div className="absolute bottom-1/3 left-2 z-10 flex flex-col gap-1">
                {hasVideo && (
                    <div className="bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-sm text-blue-600 border border-blue-100">
                        <Play size={14} fill="currentColor" />
                    </div>
                )}
                {isLowStock && (
                    <div className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                        {tMarketing('kam_qoldi')}
                    </div>
                )}
            </div>

            {/* Wishlist Button */}
            <div className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-sm shadow-sm transition-all duration-300 cursor-pointer group/heart ${isInWishlist(id) ? 'bg-red-50 text-red-500' : 'bg-white/80 text-slate-400 hover:text-red-500 hover:bg-white'}`}
                onClick={handleToggleWishlist}
            >
                <Heart
                    size={18}
                    className={`${isInWishlist(id) ? 'fill-current' : ''} transition-transform duration-300 group-hover/heart:scale-110`}
                    strokeWidth={isInWishlist(id) ? 0 : 2}
                />
            </div>

            {/* Image Wrapper */}
            <div className="aspect-[4/5] bg-slate-50 w-full relative p-4 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                    <img
                        src={image || "https://placehold.co/400"}
                        alt={title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 mix-blend-multiply"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/400?text=No+Image";
                        }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="p-3 md:p-4 flex flex-col flex-1">
                <h3 className="text-xs md:text-sm font-medium text-slate-700 line-clamp-2 min-h-[2.5em] mb-1 leading-snug group-hover:text-blue-600 transition-colors" title={title}>
                    {title}
                </h3>

                <div className="flex items-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={10} className={`${i <= 5 ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                    ))}
                    <span className="text-[10px] text-slate-400 ml-1">(5)</span>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                    <div className="flex flex-col">
                        {allowInstallment && (
                            <div className="text-[10px] bg-amber-100 text-amber-700 w-fit px-1.5 py-0.5 rounded font-bold mb-1">
                                {tMarketing('oyiga')} {monthlyPayment.toLocaleString()} {t('som')} {tMarketing('dan')}
                            </div>
                        )}
                        {oldPrice && <div className="text-[10px] text-slate-400 line-through decoration-red-500 decoration-1">{oldPrice.toLocaleString()} {t('som')}</div>}
                        <div className="text-sm md:text-lg font-black text-blue-600">{price.toLocaleString()} <span className="text-xs font-medium">{t('som')}</span></div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                        <button
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1 shadow-md shadow-blue-600/20 active:scale-95"
                            onClick={handleBuyNow}
                            disabled={isBuying}
                        >
                            {isBuying ? <Loader2 size={14} className="animate-spin" /> : t('sotib_olish')}
                        </button>
                        <button
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors active:scale-95"
                            aria-label="Savatga qo'shish"
                            onClick={handleAddToCart}
                        >
                            <ShoppingBag size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    )
}
