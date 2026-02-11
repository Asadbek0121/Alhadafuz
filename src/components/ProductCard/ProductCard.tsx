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
        <Link href={`/product/${id}`} className="group relative bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            {/* Badges */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                {isSale && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">-20%</span>}
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">Yangi</span>
            </div>

            {/* Wishlist Button */}
            <div className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-sm shadow-sm transition-all duration-300 cursor-pointer group/heart ${isInWishlist(id) ? 'bg-red-50 text-red-500' : 'bg-white/80 text-slate-400 hover:text-red-500 hover:bg-white'}`}
                onClick={handleToggleWishlist}
            >
                <Heart
                    size={20}
                    className={`transition-all duration-300 ${isInWishlist(id) ? 'fill-current scale-110' : 'group-hover/heart:scale-110'}`}
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
