"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from './ProductCard.module.css';
import { ShoppingBag, Heart, Scale, Star, Loader2, Truck, Play, Gift, AlertTriangle } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore'; // Updated import
import { useTranslations } from 'next-intl';
import { useWishlist } from '@/context/WishlistContext';
import { useState } from 'react';
import { toast } from 'sonner';
import { discountPercent, hasRealDiscount } from '@/lib/product-discount';
import { isChinaItem } from '@/store/useCartStore';

interface ProductProps {
    id: string; // Updated to string
    title: string;
    price: number;
    oldPrice?: number;
    image: string;
    /** Admin kiritgan chegirma miqdori — `null`/0 bo'lsa kartada chegirma ko'rinmaydi. */
    discount?: number | null;
    discountType?: string | null;
    isNew?: boolean;
    freeDelivery?: boolean;
    hasVideo?: boolean;
    hasGift?: boolean;
    showLowStock?: boolean;
    allowInstallment?: boolean;
    stock?: number;
    priority?: boolean;
    rating?: number;
    reviewCount?: number;
    /** Fulfillment turi: `LOCAL` (oddiy) yoki `CHINA_ORDER` (Xitoydan buyurtma). */
    fulfillmentType?: string;
}

export default function ProductCard(props: ProductProps) {
    const {
        id, title, price, oldPrice, image, discount, discountType,
        freeDelivery, hasVideo, hasGift, showLowStock, allowInstallment, stock, priority = false,
        rating = 0, reviewCount, fulfillmentType
    } = props;
    const { addToCart } = useCartStore(); // Updated hook
    const t = useTranslations('Header');
    const tMarketing = useTranslations('Marketing');
    const tChina = useTranslations('ChinaOrder');
    const { toggleWishlist, isInWishlist } = useWishlist();
    const router = useRouter();
    const [isBuying, setIsBuying] = useState(false);
    const isOutOfStock = typeof stock !== 'undefined' && stock <= 0;

    // Chegirma faqat admin uni ataylab belgilaganda ko'rinadi. Ilgari bu yerda
    // faqat `oldPrice > price` tekshirilardi — natijada "Chegirma yo'q"
    // tanlangan, ammo eski narxi to'ldirilgan mahsulot ham chegirmali bo'lib
    // chiqardi. Mantiq `src/lib/product-discount.ts` da, mahsulot sahifasi ham
    // shu funksiyalarni ishlatadi.
    const showDiscount = hasRealDiscount({ discount });
    const discountPercentage = discountPercent({ price, oldPrice, discount });

    const isLowStock = showLowStock && typeof stock !== 'undefined' && stock > 0 && stock < 10;
    const monthlyPayment = Math.round(price / 12);
    const isChina = isChinaItem({ fulfillmentType });

    // "AKSIYA" sticker faqat HOT/PROMO marketing turlarida chiqadi — oddiy % chegirma ribbon bilan ko'rsatiladi
    const isCampaignSticker = discountType === 'HOT' || discountType === 'PROMO';

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        addToCart({
            id,
            title,
            price,
            image,
            fulfillmentType: isChinaItem({ fulfillmentType }) ? 'CHINA_ORDER' : 'LOCAL'
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
            image,
            fulfillmentType: isChinaItem({ fulfillmentType }) ? 'CHINA_ORDER' : 'LOCAL'
        });
        router.push(`/${window.location.pathname.split('/')[1]}/checkout`);
    };

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        toggleWishlist(id);
    };

    const activeWishlist = isInWishlist(id);

    // Badge'lar — maksimal 2 ta, ustuvorlik tartibida
    const badges: React.ReactNode[] = [];
    if (isChina) {
        // CHINA_ORDER badge — eng yuqori ustuvorlik
        badges.push(
            <div key="china" className={`${styles.promoSticker} bg-red-600 text-white`}>
                {tChina('order_based')}
            </div>
        );
    }
    if (isOutOfStock) {
        badges.push(
            <div key="stock" className={`${styles.promoSticker} bg-red-600 text-white`}>
                {tMarketing('tugagan')}
            </div>
        );
    } else {
        if (isCampaignSticker) {
            badges.push(
                <div key="disc" className={`${styles.promoSticker} ${discountType === 'HOT' ? styles.hotTheme : styles.promoTheme}`}>
                    {tMarketing(discountType.toLowerCase())}
                </div>
            );
        }
        if (!isChina && freeDelivery) {
            badges.push(
                <div key="del" className={`${styles.promoSticker} ${styles.deliveryTheme}`}>
                    <Truck size={12} className="mr-1" /> {tMarketing('bepul')}
                </div>
            );
        }
        if (hasGift) {
            badges.push(
                <div key="gift" className={`${styles.promoSticker} ${styles.giftTheme}`}>
                    <Gift size={12} className="mr-1" /> {tMarketing('sovga')}
                </div>
            );
        }
    }

    return (
        <div className="group relative bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            {/* Clickable area: badges + image */}
            <Link href={`/product/${id}`} className="block relative">
                {/* Yuqori-chap: chegirma belgisi + marketing stikerlari (bittа ustunda,
                    shuning uchun qo'lda yozilgan `top` offsetlari kerak emas) */}
                {(discountPercentage > 0 || badges.length > 0) && (
                    <div className={styles.badgeContainer}>
                        {discountPercentage > 0 && (
                            <div className={styles.discountTag}>
                                <b className={styles.discountValue}>-{discountPercentage}%</b>
                                <span className={styles.discountWord}>{tMarketing('chegirma')}</span>
                            </div>
                        )}
                        {badges.slice(0, 2)}
                    </div>
                )}

                {/* Bottom Indicators (Video, stock) */}
                <div className="absolute bottom-2 left-2 z-10 flex flex-col gap-1">
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

                {/* Rasm maydoni kvadrat: mahsulot rasmlari kvadrat yuklanadi, ilgarigi
                    4/5 balandroq quti ichida `object-contain` ularni quti balandligining
                    ~70% igacha kichraytirib, ustida-ostida bo'sh kul rang qoldirardi.
                    Padding ham 16px dan 8px ga tushdi — rasm karta kengligining
                    ~93% ini egallaydi. */}
                <div className="aspect-square bg-slate-50 w-full relative p-2 md:p-2.5 overflow-hidden">
                    <div className="w-full h-full relative">
                        <Image
                            src={image || "https://placehold.co/400"}
                            alt={title}
                            fill
                            /* Next 16 da `priority` eskirgan — `preload` uning to'g'ridan-to'g'ri o'rnini bosadi */
                            preload={priority}
                            sizes="(max-width: 639px) 48vw, (max-width: 1919px) 260px, 340px"
                            className={`object-contain group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'grayscale opacity-50' : ''}`}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.srcset = "";
                                target.src = "https://placehold.co/400?text=No+Image";
                            }}
                        />
                    </div>
                </div>
            </Link>

            {/* Wishlist Button */}
            <button
                type="button"
                onClick={handleToggleWishlist}
                className={`absolute top-2 right-2 z-30 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-300 cursor-pointer group/heart ${activeWishlist ? 'bg-red-50 text-red-500' : 'text-slate-400 hover:text-red-500 hover:bg-white'}`}
                aria-pressed={activeWishlist}
                aria-label={activeWishlist ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo'shish"}
            >
                <Heart
                    size={18}
                    className={`${activeWishlist ? 'fill-current' : ''} transition-transform duration-300 group-hover/heart:scale-110`}
                    strokeWidth={activeWishlist ? 0 : 2}
                />
            </button>

            {/* Content */}
            <div className="p-3 md:p-4 flex flex-col flex-1">
                <Link href={`/product/${id}`} className="block">
                    <h3 className="text-xs md:text-sm font-medium text-slate-700 line-clamp-2 min-h-[2.5em] mb-1 leading-snug group-hover:text-blue-600 transition-colors" title={title}>
                        {title}
                    </h3>
                </Link>

                {rating > 0 && (
                    <div className="flex items-center gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} size={10} className={`${i <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                        ))}
                        {typeof reviewCount === 'number' && reviewCount > 0 && (
                            <span className="text-[10px] text-slate-400 ml-1">({reviewCount})</span>
                        )}
                    </div>
                )}

                <div className="mt-auto flex flex-col gap-2">
                    <div className="flex flex-col">
                        {allowInstallment && (
                            <div className="text-[10px] bg-amber-100 text-amber-700 w-fit px-1.5 py-0.5 rounded font-bold mb-1">
                                {tMarketing('oyiga')} {monthlyPayment.toLocaleString()} {t('som')} {tMarketing('dan')}
                            </div>
                        )}
                        {/* Chizilgan eski narx ham chegirmani e'lon qiladi — chegirma
                            belgilanmagan bo'lsa ko'rinmaydi */}
                        {showDiscount && oldPrice && oldPrice > price && (
                            <div className="text-[10px] text-slate-400 line-through">{oldPrice.toLocaleString()} {t('som')}</div>
                        )}
                        <div className="text-sm md:text-lg font-black text-blue-600">{price.toLocaleString()} <span className="text-xs font-medium">{t('som')}</span></div>
                        {isChina && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                                {tChina('cargo_separate')}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            className={`flex-1 text-white text-[10px] md:text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1 shadow-md active:scale-95 ${isOutOfStock ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
                            onClick={handleBuyNow}
                            disabled={isBuying || isOutOfStock}
                        >
                            {isBuying ? <Loader2 size={14} className="animate-spin" /> : isOutOfStock ? tMarketing('tugagan') : t('sotib_olish')}
                        </button>
                        <button title="Savat"
                            className={`p-2 rounded-xl transition-colors active:scale-95 ${isOutOfStock ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                            aria-label="Savatga qo'shish"
                            onClick={handleAddToCart}
                            disabled={isOutOfStock}
                        >
                            <ShoppingBag size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
