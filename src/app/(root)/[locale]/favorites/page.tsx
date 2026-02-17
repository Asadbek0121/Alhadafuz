"use client";

import { useWishlist } from '@/context/WishlistContext';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './page.module.css';
import { Heart, ShoppingBag } from 'lucide-react';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';

export default function FavoritesPage() {
    const { wishlist } = useWishlist();
    const tWishlist = useTranslations('Wishlist');
    const tProduct = useTranslations('Product');
    const tCart = useTranslations('Cart');
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWishlistProducts = async () => {
            if (wishlist.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // Fetch all products and filter for simplicity in mock environment
                // In real app, you might have an official /api/wishlist route
                const res = await fetch('/api/products');
                const allProducts = await res.json();
                const filtered = allProducts.filter((p: any) => wishlist.includes(p.id));
                setProducts(filtered);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchWishlistProducts();
    }, [wishlist]);

    if (loading) return <div className="container" style={{ padding: '40px' }}>{tProduct('loading')}</div>;

    if (wishlist.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-20 h-20 md:w-32 md:h-32 bg-red-50 rounded-full flex items-center justify-center mb-4 md:mb-6 relative">
                    <Heart
                        size={40}
                        className="text-red-500 md:w-14 md:h-14 fill-red-500/10"
                        strokeWidth={1.5}
                    />
                </div>
                <h2 className="text-xl md:text-3xl font-black text-slate-900 mb-2 md:mb-3 tracking-tight">{tWishlist('empty_title')}</h2>
                <p className="text-slate-500 max-w-[280px] md:max-w-sm mb-6 md:mb-8 leading-relaxed text-xs md:text-base mx-auto">
                    {tWishlist('empty_desc')}
                </p>
                <Link href="/" className="px-6 py-3 md:px-8 md:py-3.5 bg-blue-600 text-white text-sm md:text-base rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                    {tCart('back_home')}
                </Link>
            </div>
        );
    }

    return (
        <div className={`container ${styles.container}`}>
            <h1 className={styles.title}>{tWishlist('title')}</h1>
            <div className={styles.grid}>
                {products.map(product => (
                    <ProductCard
                        key={product.id}
                        id={product.id}
                        title={product.title}
                        price={product.price}
                        oldPrice={product.oldPrice}
                        image={product.image}
                        isSale={product.isSale}
                        discountType={product.discountType}
                        isNew={product.isNew}
                        freeDelivery={product.freeDelivery}
                        hasVideo={product.hasVideo}
                        hasGift={product.hasGift}
                        showLowStock={product.showLowStock}
                        allowInstallment={product.allowInstallment}
                        stock={product.stock}
                    />
                ))}
            </div>
        </div>
    );
}
