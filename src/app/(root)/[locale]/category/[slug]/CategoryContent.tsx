"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useRouter } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutGrid, ArrowLeft, ShoppingBag, Package, ArrowUpDown, SlidersHorizontal, X } from 'lucide-react';
import Image from 'next/image';
import styles from './CategoryContent.module.css';
import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard/ProductCard';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTranslations, useLocale } from 'next-intl';
import { getCategoryName } from '@/lib/translate';

interface CategoryBanner {
    id: string;
    title: string;
    description?: string | null;
    image: string;
    link?: string;
}

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
    banners?: CategoryBanner[];
    products?: any[];
    totalCount?: number;
    rootCategories?: any[];
    initialFilters?: {
        sort?: string;
        category?: string;
        minPrice?: string;
        maxPrice?: string;
        discount?: string;
    };
}

interface FilterState {
    category: string;
    minPrice: string;
    maxPrice: string;
    discount: boolean;
}

const SORT_OPTIONS = ['recommended', 'price_asc', 'price_desc', 'newest', 'discount'] as const;

// Desktop Banner Carousel Component
function DesktopBannerCarousel({ banners }: { banners: CategoryBanner[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        // Track impressions on mount
        banners.forEach(banner => {
            fetch(`/api/admin/banners/${banner.id}/impression`, { method: 'POST' })
                .catch(() => {});
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
                            <Image
                                src={banner.image}
                                alt={banner.title}
                                fill
                                sizes="(max-width: 768px) 100vw, 1200px"
                                className="object-cover"
                            />
                            {(banner.title || banner.description) && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8">
                                    {banner.title && (
                                        <h3 className="text-white text-2xl lg:text-4xl font-bold drop-shadow-lg">
                                            {banner.title}
                                        </h3>
                                    )}
                                    {banner.description && (
                                        <p className="text-white/85 text-sm lg:text-base font-medium mt-2 max-w-2xl line-clamp-2 drop-shadow">
                                            {banner.description}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );

                    const handleClick = () => {
                        if (banner.link) {
                            fetch(`/api/admin/banners/${banner.id}/click`, { method: 'POST' })
                                .catch(() => {});
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
                        aria-label="Oldingi"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        aria-label="Keyingi"
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
                                aria-label={`Banner ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Sort toolbar — URL'ni yangilaydi
function SortToolbar({ sort, onSortChange }: { sort: string; onSortChange: (v: string) => void }) {
    const t = useTranslations('Search');
    const [open, setOpen] = useState(false);
    const current = SORT_OPTIONS.find(o => o === sort) || 'recommended';

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
                <ArrowUpDown size={14} />
                <span className="hidden sm:inline">{t('sort')}</span>
                <span className="text-blue-600">{t(`sort_${current}`)}</span>
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-2xl border border-slate-100 bg-white py-2 shadow-2xl">
                        {SORT_OPTIONS.map((key) => {
                            const value = key === 'recommended' ? '' : key;
                            const isActive = (sort === key) || (key === 'recommended' && !sort);
                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        onSortChange(value);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                >
                                    {t(`sort_${key}`)}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default function CategoryContent({ category, banners = [], products = [], totalCount, rootCategories = [], initialFilters = {} }: CategoryContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isMobile = useMediaQuery('(max-width: 992px)');
    const t = useTranslations('Search');
    const tHeader = useTranslations('Header');
    const locale = useLocale();
    // Mobil drill-down: null = root kategoriyalar ko'rsatiladi, tanlanganda subkategoriyalar
    const [selectedParent, setSelectedParent] = useState<any | null>(null);
    // Filter drawer state
    const [showFilters, setShowFilters] = useState(false);
    const [showSort, setShowSort] = useState(false);
    // Draft filters — Apply bosilganda URL ga yoziladi (har click'da request yuborilmaydi)
    const [draftFilters, setDraftFilters] = useState<FilterState>({
        category: initialFilters.category || '',
        minPrice: initialFilters.minPrice || '',
        maxPrice: initialFilters.maxPrice || '',
        discount: initialFilters.discount === '1',
    });

    // Escape + scroll lock filter drawer uchun
    useEffect(() => {
        if (!showFilters) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowFilters(false); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [showFilters]);

    // Track impressions once (bitta qatordan — double tracking oldini olish)
    useEffect(() => {
        if (banners.length > 0) {
            banners.forEach(banner => {
                fetch(`/api/admin/banners/${banner.id}/impression`, { method: 'POST' })
                    .catch(() => {});
            });
        }
    }, [banners]);

    const currentSort = searchParams.get('sort') || '';

    const handleSortChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set('sort', value);
        else params.delete('sort');
        router.replace(`/category/${category.slug}?${params.toString()}`);
        setShowSort(false);
    };

    // Faol filterlar soni (sort hisoblanmaydi)
    const activeFilterCount =
        (draftFilters.category ? 1 : 0) +
        (draftFilters.minPrice ? 1 : 0) +
        (draftFilters.maxPrice ? 1 : 0) +
        (draftFilters.discount ? 1 : 0);

    const buildUrl = (f: FilterState, sort?: string) => {
        const params = new URLSearchParams();
        if (sort) params.set('sort', sort);
        if (f.category) params.set('category', f.category);
        if (f.minPrice) params.set('minPrice', f.minPrice);
        if (f.maxPrice) params.set('maxPrice', f.maxPrice);
        if (f.discount) params.set('discount', '1');
        const qs = params.toString();
        return `/category/${category.slug}${qs ? `?${qs}` : ''}`;
    };

    const handleApplyFilters = () => {
        router.replace(buildUrl(draftFilters, currentSort));
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        const cleared: FilterState = { category: '', minPrice: '', maxPrice: '', discount: false };
        setDraftFilters(cleared);
        router.replace(buildUrl(cleared, currentSort));
        setShowFilters(false);
    };

    const count = typeof totalCount === 'number' ? totalCount : products.length;

    // Filter drawer — mobil'da bottom sheet, desktop'da ham ishlatiladi
    const renderFilterDrawer = () => {
        const filterTree = rootCategories.length > 0 ? rootCategories : [category];
        return (
            <>
                {showFilters && (
                    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={t('filters')}>
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowFilters(false)} aria-hidden="true" />
                        <div className="relative w-full max-w-sm bg-white shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom)]">
                            <div className="flex items-center justify-between border-b border-slate-100 p-5">
                                <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">{t('filters')}</h2>
                                <button onClick={() => setShowFilters(false)} className="rounded-xl p-2 hover:bg-slate-100" aria-label={t('clear_filters')}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                {/* Category filter */}
                                <div>
                                    <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-900">{t('category')}</h3>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => setDraftFilters(f => ({ ...f, category: '' }))}
                                            className={`flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-medium ${!draftFilters.category ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {t('all_categories')}
                                        </button>
                                        {filterTree.map((root: any) => (
                                            <div key={root.id}>
                                                <button
                                                    onClick={() => setDraftFilters(f => ({ ...f, category: root.slug }))}
                                                    className={`flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-bold ${draftFilters.category === root.slug ? 'bg-blue-50 text-blue-600' : 'text-slate-800 hover:bg-slate-50'}`}
                                                >
                                                    {getCategoryName(root, locale)}
                                                </button>
                                                {(root.children || []).map((child: any) => (
                                                    <button
                                                        key={child.id}
                                                        onClick={() => setDraftFilters(f => ({ ...f, category: child.slug }))}
                                                        className={`flex w-full items-center rounded-xl py-2 pl-10 pr-4 text-left text-sm font-medium ${draftFilters.category === child.slug ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        <span className="mr-2 text-slate-300">└</span>{getCategoryName(child, locale)}
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Price range */}
                                <div>
                                    <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-900">{t('price')}</h3>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            placeholder={t('min_price')}
                                            value={draftFilters.minPrice}
                                            onChange={(e) => setDraftFilters(f => ({ ...f, minPrice: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                                        />
                                        <span className="text-slate-400">—</span>
                                        <input
                                            type="number"
                                            placeholder={t('max_price')}
                                            value={draftFilters.maxPrice}
                                            onChange={(e) => setDraftFilters(f => ({ ...f, maxPrice: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Discount */}
                                <div>
                                    <label className="flex cursor-pointer items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={draftFilters.discount}
                                            onChange={(e) => setDraftFilters(f => ({ ...f, discount: e.target.checked }))}
                                            className="h-5 w-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-bold text-slate-900">{t('discount_only')}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Bottom actions */}
                            <div className="flex gap-3 border-t border-slate-100 p-5">
                                <button
                                    onClick={handleClearFilters}
                                    className="flex-1 rounded-2xl bg-slate-100 py-3.5 text-sm font-black text-slate-700"
                                >
                                    {t('clear_filters')}
                                </button>
                                <button
                                    onClick={handleApplyFilters}
                                    className="flex-[2] rounded-2xl bg-blue-600 py-3.5 text-sm font-black text-white"
                                >
                                    {count > 0 ? t('results', { count }) : t('apply_filters')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    // Ota kategoriyalar (children bor) — barcha viewport'larda drill-down:
    // avval root kategoriyalar, tanlanganda subkategoriyalar, so'ng mahsulotlar.
    // Leaf kategoriya (children yo'q) — to'g'ridan-to'g'ri mahsulotlar (mobil/desktop split).
    const isParentCategory = category.children && category.children.length > 0;
    if (isMobile) {
        // Mobil drill-down: faqat mobil'da root/sub browser ko'rsatiladi.
        // Desktop'da parent kategoriya ham `desktopWrapper` ishlatadi —
        // subcategories grid + products. (`isParentCategory` desktop'da mobil
        // branch'ni ishga tushirmaydi — aks holda root sahifasi bo'sh qolardi.)
        const isParent = category.children && category.children.length > 0;
        const showRoots = isParent && !selectedParent;
        const roots = rootCategories.length > 0 ? rootCategories : (category.parent ? [] : [category]);
        const catHref = (slug: string) => `/${locale}/category/${slug}`;

        return (
            <>
            <div className={styles.mobileWrapper}>
                {/* Header */}
                <div className={styles.mobileHeader}>
                    <button className={styles.backBtn} onClick={() => {
                        if (selectedParent) { setSelectedParent(null); return; }
                        router.back();
                    }}>
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className={styles.headerTitle}>{showRoots ? t('category') : (selectedParent ? getCategoryName(selectedParent, locale) : getCategoryName(category, locale))}</h1>
                </div>

                {/* Banners Section */}
                {banners.length > 0 && (
                    <div className="px-4 mb-4 mt-2">
                        <div className="flex gap-3 overflow-x-auto snap-x no-scrollbar pb-2">
                            {banners.map(banner => {
                                const BannerContent = (
                                    <div key={banner.id} className="min-w-[85%] snap-start rounded-2xl overflow-hidden relative h-40 shadow-sm border border-gray-100">
                                        <Image src={banner.image} alt={banner.title} fill sizes="85vw" className="object-cover" />
                                        {(banner.title || banner.description) && (
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
                                                {banner.title && <span className="block text-white text-sm font-bold line-clamp-1">{banner.title}</span>}
                                                {banner.description && <span className="block text-white/80 text-xs font-medium line-clamp-1 mt-0.5">{banner.description}</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                                const handleClick = () => {
                                    if (banner.link) {
                                        fetch(`/api/admin/banners/${banner.id}/click`, { method: 'POST' }).catch(() => {});
                                    }
                                };
                                return banner.link ? (
                                    <Link key={banner.id} href={banner.link} onClick={handleClick}>{BannerContent}</Link>
                                ) : (
                                    <div key={banner.id}>{BannerContent}</div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content: root categories va subcategories */}
                <div className="p-4">
                    {showRoots ? (
                        // Level 1: root categories (3 per row)
                        <div className={styles.cardGridRoot}>
                            {roots.map((root: any) => (
                                <button
                                    key={root.id}
                                    type="button"
                                    onClick={() => {
                                        // Agar bu rootning o'zi bo'lsa — uning children'ini ko'rsat
                                        if (root.id === category.id || root.slug === category.slug) {
                                            setSelectedParent(category);
                                        } else {
                                            // Boshqa root — navigatsiya
                                            window.location.href = catHref(root.slug);
                                        }
                                    }}
                                    className={styles.cardRoot}
                                >
                                    {root.image ? (                                        <img src={root.image} alt={getCategoryName(root, locale)} className={styles.cardRootImg} />
                                    ) : (
                                        <div className={styles.cardRootIcon}>{getCategoryName(root, locale).charAt(0)}</div>
                                    )}
                                    <span className={styles.cardRootName}>{getCategoryName(root, locale)}</span>
                                </button>
                            ))}
                        </div>
                    ) : selectedParent ? (
                        // Level 2: subcategories of selected parent (4 per row)
                        <div className={styles.cardGridSub}>
                            {(selectedParent.children || []).map((child: any) => (
                                <a
                                    key={child.id}
                                    href={catHref(child.slug)}
                                    className={styles.cardSub}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div className={styles.cardSubImage}>
                                        {child.image ? (
                                            <img src={child.image} alt={getCategoryName(child, locale)} loading="lazy" />
                                        ) : (
                                            <span className={styles.cardSubLetter}>{getCategoryName(child, locale).charAt(0)}</span>
                                        )}
                                    </div>
                                    <span className={styles.cardSubName}>{getCategoryName(child, locale)}</span>
                                </a>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Products Grid (Mobile) */}
                {!showRoots && (
                    <div className="p-4 bg-gray-50 border-t mt-4">
                        {/* Product toolbar: count + filter + sort (product grid tepasida) */}
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <span className="text-sm font-bold text-slate-600">
                                {count > 0 ? t('results', { count }) : t('no_products')}
                            </span>
                            <div className="flex items-center gap-2">
                                {/* Sort */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowSort(s => !s)}
                                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                                    >
                                        <ArrowUpDown size={14} />
                                        {t('sort')}: {t(`sort_${currentSort || 'recommended'}`)}
                                    </button>
                                    {showSort && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
                                            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-2xl border border-slate-100 bg-white py-2 shadow-2xl">
                                                {SORT_OPTIONS.map((key) => {
                                                    const val = key === 'recommended' ? '' : key;
                                                    const isActive = (currentSort === key) || (key === 'recommended' && !currentSort);
                                                    return (
                                                        <button
                                                            key={key}
                                                            onClick={() => handleSortChange(val)}
                                                            className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                                        >
                                                            {t(`sort_${key}`)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                                {/* Filter */}
                                <button
                                    type="button"
                                    onClick={() => setShowFilters(true)}
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                                >
                                    <SlidersHorizontal size={14} />
                                    {t('filters')}
                                    {activeFilterCount > 0 && (
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {products.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {products.map((p) => (
                                    <ProductCard key={p.id} id={p.id} slug={p.slug} title={p.title} price={p.price}
                                        oldPrice={p.oldPrice} image={p.image || '/placeholder.png'}
                                        discount={p.discount} discountType={p.discountType}
                                        isNew={p.isNew} freeDelivery={p.freeDelivery} hasVideo={p.hasVideo}
                                        hasGift={p.hasGift} showLowStock={p.showLowStock}
                                        allowInstallment={p.allowInstallment} stock={p.stock}
                                        rating={p.rating} reviewCount={p.reviewsCount} fulfillmentType={p.fulfillmentType} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                                <Package size={44} className="text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">{t('no_results')}</p>
                                <p className="text-gray-400 text-xs mt-2 mb-4">{t('no_results_desc')}</p>
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                                    >
                                        {t('clear_filters')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Filter Drawer */}
            {renderFilterDrawer()}
            </>
        );
    }

    return (
        <>
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
                    <span className="text-gray-300">/</span>
                    <Link href="/" className="text-gray-500 hover:text-blue-600">
                        {tHeader('bosh_sahifa')}
                    </Link>
                    {category.parent && (
                        <>
                            <span className="text-gray-300">/</span>
                            <Link href={`/category/${category.parent.slug}`} className="text-gray-500 hover:text-blue-600">
                                {category.parent.name}
                            </Link>
                        </>
                    )}
                    <span className="text-gray-300">/</span>
                    <span className="text-blue-600 font-semibold">{getCategoryName(category, locale)}</span>
                </div>

                <h1 className="text-3xl font-bold mb-2 text-gray-900">{getCategoryName(category, locale)}</h1>
                <p className="text-sm font-bold text-slate-500 mb-8">{t('results', { count })}</p>

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
<div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 relative h-28">
                                                {sub.image ? (
                                                    <Image
                                                        src={sub.image}
                                                        alt={sub.name}
                                                        fill
                                                        sizes="80px"
                                                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
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
                     <div className="mb-6 flex items-center justify-between">
                         <div>
                             <h2 className="text-2xl font-bold flex items-center gap-2">
                                 <ShoppingBag size={24} className="text-blue-600" />
                                 {tHeader('mahsulotlar')}
                             </h2>
                             <p className="text-sm font-bold text-slate-500 mt-1">{count > 0 ? t('results', { count }) : t('no_products')}</p>
                         </div>
                         <div className="flex items-center gap-2">
                             <SortToolbar sort={currentSort} onSortChange={handleSortChange} />
                             <button
                                 type="button"
                                 onClick={() => setShowFilters(true)}
                                 className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                             >
                                 <SlidersHorizontal size={14} />
                                 {t('filters')}
                                 {activeFilterCount > 0 && (
                                     <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white">
                                         {activeFilterCount}
                                     </span>
                                 )}
                             </button>
                         </div>
                     </div>
                     {products.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {products.map((p) => (
                                <ProductCard
                                    key={p.id}
                                    id={p.id}
                                    slug={p.slug}
                                    title={p.title}
                                    price={p.price}
                                    oldPrice={p.oldPrice}
                                    image={p.image || '/placeholder.png'}
                                    discount={p.discount}
                                    discountType={p.discountType}
                                    isNew={p.isNew}
                                    freeDelivery={p.freeDelivery}
                                    hasVideo={p.hasVideo}
                                    hasGift={p.hasGift}
                                    showLowStock={p.showLowStock}
                                    allowInstallment={p.allowInstallment}
                                    stock={p.stock}
                                    rating={p.rating}
                                    reviewCount={p.reviewsCount}
                                    fulfillmentType={p.fulfillmentType}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <Package size={48} className="text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">{t('no_results')}</p>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={handleClearFilters}
                                    className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                                >
                                    {t('clear_filters')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
        {renderFilterDrawer()}
        </>
    );
}
