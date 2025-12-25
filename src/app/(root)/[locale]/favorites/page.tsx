"use client";

import { useWishlist } from '@/context/WishlistContext';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './page.module.css';
import { Heart } from 'lucide-react';
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
            <div className={`container ${styles.empty}`}>
                <div className={styles.emptyIcon}>
                    <Heart size={64} strokeWidth={1} color="#ccc" />
                </div>
                <h2>{tWishlist('empty_title')}</h2>
                <p>{tWishlist('empty_desc')}</p>
                <Link href="/" className="btn btn-primary" style={{ marginTop: '24px' }}>
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
                        oldPrice={product.originalPrice}
                        image={product.image}
                        isSale={product.isSale}
                    />
                ))}
            </div>
        </div>
    );
}
