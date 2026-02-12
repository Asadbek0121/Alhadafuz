"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutGrid, ArrowLeft, ShoppingBag, Package } from 'lucide-react';
import styles from './CategoryContent.module.css';
import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard/ProductCard';

interface CategoryContentProps {
    category: {
        id: string;
        name: string;
        slug: string;
        parent?: {
            id: string;
            name: string;
            slug: string;
        } | null;
        children?: {
            id: string;
            name: string;
            slug: string;
            image?: string | null;
        }[];
    };
    banners?: {
        id: string;
        title: string;
        image: string;
        link?: string;
    }[];
    products?: any[];
}

// Desktop Banner Carousel Component
function DesktopBannerCarousel({ banners }: { banners: { id: string; title: string; image: string; link?: string }[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        // Track impressions on mount
        banners.forEach(banner => {
            fetch(`/api/admin/banners/${banner.id}/impression`, { method: 'POST' })
                .catch(err => console.error('Failed to track impression:', err));
        });
    }, [banners]);

    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [banners.length]);

    const next = () => setCurrentIndex(prev => (prev + 1) % banners.length);
    const prev = () => setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);

    return (
        <div className="relative rounded-2xl overflow-hidden shadow-xl group">
            <div className="relative h-[300px] lg:h-[400px]">
                {banners.map((banner, index) => {
                    const BannerContent = (
                        <div
                            className={`absolute inset-0 transition-opacity duration-700 ${index === currentIndex ? 'opacity-100' : 'opacity-0'
                                }`}
                            style={{ pointerEvents: index === currentIndex ? 'auto' : 'none' }}
                        >
                            <img
                                src={banner.image}
                                alt={banner.title}
                                className="w-full h-full object-cover"
                            />
                            {banner.title && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8">
                                    <h3 className="text-white text-2xl lg:text-4xl font-bold drop-shadow-lg">
                                        {banner.title}
                                    </h3>
                                </div>
                            )}
                        </div>
                    );

                    const handleClick = () => {
                        if (banner.link) {
                            fetch(`/api/admin/banners/${banner.id}/click`, { method: 'POST' })
                                .catch(err => console.error('Failed to track click:', err));
                        }
                    };

                    return banner.link ? (
                        <Link key={banner.id} href={banner.link} onClick={handleClick}>
                            {BannerContent}
                        </Link>
                    ) : (
                        <div key={banner.id}>{BannerContent}</div>
                    );
                })}
            </div>

            {/* Navigation */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    >
                        <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {banners.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`h-3 rounded-full transition-all ${index === currentIndex ? 'bg-white w-8' : 'bg-white/50 w-3 hover:bg-white/75'
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default function CategoryContent({ category, banners = [], products = [] }: CategoryContentProps) {
    const router = useRouter();

    // Track impressions for mobile banners
    useEffect(() => {
        if (banners.length > 0) {
            banners.forEach(banner => {
                fetch(`/api/admin/banners/${banner.id}/impression`, { method: 'POST' })
                    .catch(err => console.error('Failed to track impression:', err));
            });
        }
    }, [banners]);

    return (
        <>
            {/* Mobile View */}
            <div className={styles.mobileWrapper}>
                {/* Header */}
                <div className={styles.mobileHeader}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className={styles.headerTitle}>{category.name}</h1>
                </div>

                {/* Banners Section */}
                {banners.length > 0 && (
                    <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                        <div style={{ overflowX: 'auto', display: 'flex', gap: '12px', scrollSnapType: 'x mandatory' }}>
                            {banners.map(banner => {
                                const BannerContent = (
                                    <div key={banner.id} style={{ minWidth: '100%', scrollSnapAlign: 'start', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '180px', cursor: banner.link ? 'pointer' : 'default' }}>
                                        <img src={banner.image} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        {banner.title && (
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '20px 16px 12px', color: 'white', fontWeight: 600 }}>
                                                {banner.title}
                                            </div>
                                        )}
                                    </div>
                                );

                                const handleClick = () => {
                                    if (banner.link) {
                                        fetch(`/api/admin/banners/${banner.id}/click`, { method: 'POST' })
                                            .catch(err => console.error('Failed to track click:', err));
                                    }
                                };

                                return banner.link ? (
                                    <Link key={banner.id} href={banner.link} onClick={handleClick}>
                                        {BannerContent}
                                    </Link>
                                ) : (
                                    <div key={banner.id}>
                                        {BannerContent}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tab / Breadcrumb Indicator */}
                <div className={styles.tabBar}>
                    <div className={styles.tabItem}>
                        <LayoutGrid size={18} />
                        <span>{category.name}</span>
                    </div>
                </div>

                {/* List */}
                <div className={styles.list}>
                    {/* All Products Link (Only if there are subcategories) */}
                    {category.children && category.children.length > 0 && (
                        <div className={`${styles.item} ${styles.allItem}`}>
                            <span className={styles.allText}>Barcha bo'limlar</span>
                        </div>
                    )}

                    {/* Subcategories */}
                    {category.children && category.children.map((sub) => (
                        <Link key={sub.id} href={`/category/${sub.slug}`} className={styles.item}>
                            <div className={styles.itemContent}>
                                <div className={styles.iconWrapper}>
                                    {sub.image ? (
                                        <img src={sub.image} alt={sub.name} onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement!.style.background = '#ccc';
                                        }} />
                                    ) : (
                                        <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                                            {sub.name.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <span className={styles.itemName}>{sub.name}</span>
                            </div>
                            <ChevronRight size={20} className={styles.arrow} />
                        </Link>
                    ))}
                </div>

                {/* Products Grid (Mobile) */}
                {products.length > 0 && (
                    <div className="p-4 bg-gray-50 border-t mt-4">
                        <h2 className="text-xl font-bold mb-4">Mahsulotlar</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {products.map((p) => (
                                <ProductCard
                                    key={p.id}
                                    id={p.id}
                                    title={p.title}
                                    price={p.price}
                                    oldPrice={p.oldPrice}
                                    image={p.image || '/placeholder.png'}
                                    isSale={p.isSale}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop View */}
            <div className={styles.desktopWrapper}>
                <div className="container py-8">
                    {/* Breadcrumbs / Back button */}
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors"
                        >
                            <ArrowLeft size={18} />
                            <span>Orqaga</span>
                        </button>
                        {category.parent && (
                            <>
                                <span className="text-gray-300">/</span>
                                <Link href={`/category/${category.parent.slug}`} className="text-gray-500 hover:text-blue-600">
                                    {category.parent.name}
                                </Link>
                            </>
                        )}
                        <span className="text-gray-300">/</span>
                        <span className="text-blue-600 font-semibold">{category.name}</span>
                    </div>

                    <h1 className="text-3xl font-bold mb-8 text-gray-900">{category.name}</h1>

                    {/* Desktop Banners */}
                    {banners.length > 0 && (
                        <div className="mb-8">
                            <DesktopBannerCarousel banners={banners} />
                        </div>
                    )}

                    {/* Subcategories Grid */}
                    {category.children && category.children.length > 0 && (
                        <div className="mb-12">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <LayoutGrid size={22} className="text-blue-600" />
                                Ichki bo'limlar
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {category.children?.map(sub => (
                                    <Link
                                        key={sub.id}
                                        href={`/category/${sub.slug}`}
                                        className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-xl transition-all duration-300 hover:scale-105"
                                    >
                                        <div className="flex flex-col h-full min-h-[160px]">
                                            <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                                                {sub.image ? (
                                                    <img
                                                        src={sub.image}
                                                        alt={sub.name}
                                                        className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                                        <span className="text-white text-3xl font-bold">
                                                            {sub.name.charAt(0)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 border-t border-gray-100 bg-white">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-gray-800 text-sm line-clamp-2 flex-1">
                                                        {sub.name}
                                                    </span>
                                                    <ChevronRight
                                                        size={18}
                                                        className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Products Grid (Desktop) */}
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <ShoppingBag size={24} className="text-blue-600" />
                            Mahsulotlar
                        </h2>
                        {products.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {products.map((p) => (
                                    <ProductCard
                                        key={p.id}
                                        id={p.id}
                                        title={p.title}
                                        price={p.price}
                                        oldPrice={p.oldPrice}
                                        image={p.image || '/placeholder.png'}
                                        isSale={p.isSale}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <Package size={48} className="text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">Hozircha mahsulotlar mavjud emas</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
