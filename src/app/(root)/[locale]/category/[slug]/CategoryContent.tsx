"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import styles from './CategoryContent.module.css';

interface CategoryContentProps {
    category: {
        id: string;
        name: string;
        slug: string;
        children?: {
            id: string;
            name: string;
            slug: string;
            image?: string | null;
        }[];
    };
}

export default function CategoryContent({ category }: CategoryContentProps) {
    const router = useRouter();

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

                {/* Tab / Breadcrumb Indicator */}
                <div className={styles.tabBar}>
                    <div className={styles.tabItem}>
                        <LayoutGrid size={18} />
                        <span>{category.name}</span>
                    </div>
                </div>

                {/* List */}
                <div className={styles.list}>
                    {/* All Products Link */}
                    <Link href={`/category/${category.slug}/products`} className={`${styles.item} ${styles.allItem}`}>
                        <span className={styles.allText}>Barcha mahsulotlar</span>
                        <ChevronRight size={20} className={styles.arrow} />
                    </Link>

                    {/* Subcategories */}
                    {category.children && category.children.map((sub) => (
                        <Link key={sub.id} href={`/category/${sub.slug}`} className={styles.item}>
                            <div className={styles.itemContent}>
                                <div className={styles.iconWrapper}>
                                    {sub.image ? (
                                        <img src={sub.image} alt={sub.name} onError={(e) => {
                                            // Fallback if image fails
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement!.style.background = '#ccc';
                                        }} />
                                    ) : (
                                        // Placeholder logic or simple letter
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

                    {(!category.children || category.children.length === 0) && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                            Ichki bo'limlar mavjud emas.
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop View (Placeholder for now, or minimal) */}
            <div className={styles.desktopWrapper}>
                <div className="container py-8">
                    <h1 className="text-3xl font-bold mb-6">{category.name}</h1>
                    <div className="grid grid-cols-4 gap-6">
                        {category.children?.map(sub => (
                            <Link key={sub.id} href={`/category/${sub.slug}`} className="block border p-4 rounded hover:shadow-lg transition">
                                {sub.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
