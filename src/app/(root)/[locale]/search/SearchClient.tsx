"use client";

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown, Loader2, Package, ArrowUpDown } from 'lucide-react';
import ProductCard from '@/components/ProductCard/ProductCard';

const SORT_OPTIONS = ['recommended', 'price_asc', 'price_desc', 'newest', 'discount'] as const;
const RECENT_KEY = 'hadaf-recent-searches';
const MAX_RECENT = 5;

export default function SearchClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const t = useTranslations('Search');
    const tHeader = useTranslations('Header');

    const q = searchParams.get('q') || '';
    const sort = searchParams.get('sort') || 'recommended';
    const categorySlug = searchParams.get('category') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const discountOnly = searchParams.get('discount') === '1';
    const page = parseInt(searchParams.get('page') || '1');

    const [inputValue, setInputValue] = useState(q);
    const [products, setProducts] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const abortRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);

    // Load recent searches and categories on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(RECENT_KEY);
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch { /* ignore */ }
        // Fetch categories for filter (root + children, flat tree)
        fetch('/api/categories')
            .then(r => r.json())
            .then(data => {
                const roots = Array.isArray(data) ? data : [];
                const tree: { id: string; name: string; slug: string; depth: number }[] = [];
                for (const root of roots) {
                    tree.push({ id: root.id, name: root.name, slug: root.slug, depth: 0 });
                    for (const child of root.children || []) {
                        tree.push({ id: child.id, name: child.name, slug: child.slug, depth: 1 });
                    }
                }
                setCategories(tree);
            })
            .catch(() => {});
    }, []);

    // Filter drawer Escape key + scroll lock
    useEffect(() => {
        if (!showFilters) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowFilters(false);
        };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [showFilters]);

    // Fetch products — faqat qidiruv yoki filter parametri bo'lsa.
    // Bo'sh /search (query'siz, filter'siz) -> fetch qilinmaydi, prompt ko'rsatiladi.
    const hasAnyFilter = !!(q || categorySlug || minPrice || maxPrice || discountOnly || (sort && sort !== 'recommended'));
    const fetchProducts = useCallback(async (abortSignal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (sort && sort !== 'recommended') params.set('sort', sort);
            if (categorySlug) params.set('category', categorySlug);
            if (minPrice) params.set('minPrice', minPrice);
            if (maxPrice) params.set('maxPrice', maxPrice);
            if (discountOnly) params.set('discount', '1');
            params.set('page', String(page));
            params.set('limit', '20');

            const res = await fetch(`/api/products?${params.toString()}`, {
                signal: abortSignal,
            });
            if (!res.ok) throw new Error('Server error');
            const data = await res.json();
            // Handle both old format (array) and new format ({ products, total })
            if (Array.isArray(data)) {
                setProducts(data);
                setTotal(data.length);
                setTotalPages(1);
            } else {
                setProducts(data.products || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    }, [q, sort, categorySlug, minPrice, maxPrice, discountOnly, page]);

    useEffect(() => {
        // Bo'sh search (query'siz, filter'siz) -> fetch qilinmaydi
        if (!hasAnyFilter) {
            setProducts([]);
            setTotal(0);
            setTotalPages(1);
            setLoading(false);
            return;
        }
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        fetchProducts(controller.signal);
        return () => controller.abort();
    }, [fetchProducts, hasAnyFilter]);

    // Save recent search when user performs a search
    useEffect(() => {
        if (!q) return;
        try {
            const stored: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
            const updated = [q, ...stored.filter(s => s !== q)].slice(0, MAX_RECENT);
            localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
            setRecentSearches(updated);
        } catch { /* ignore */ }
    }, [q]);

    // Build URL with current params
    const buildUrl = useCallback((overrides: Record<string, string | undefined>) => {
        const params = new URLSearchParams();
        const qVal = overrides.q !== undefined ? overrides.q : q;
        const sortVal = overrides.sort !== undefined ? overrides.sort : sort;
        const catVal = overrides.category !== undefined ? overrides.category : categorySlug;
        const minVal = overrides.minPrice !== undefined ? overrides.minPrice : minPrice;
        const maxVal = overrides.maxPrice !== undefined ? overrides.maxPrice : maxPrice;
        const discVal = overrides.discount !== undefined ? overrides.discount : discountOnly ? '1' : '';
        const pageVal = overrides.page !== undefined ? overrides.page : String(page);

        if (qVal) params.set('q', qVal);
        if (sortVal && sortVal !== 'recommended') params.set('sort', sortVal);
        if (catVal) params.set('category', catVal);
        if (minVal) params.set('minPrice', minVal);
        if (maxVal) params.set('maxPrice', maxVal);
        if (discVal) params.set('discount', '1');
        if (pageVal && pageVal !== '1') params.set('page', pageVal);
        return `/search?${params.toString()}`;
    }, [q, sort, categorySlug, minPrice, maxPrice, discountOnly, page]);

    const navigate = (overrides: Record<string, string | undefined>) => {
        router.replace(buildUrl(overrides));
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            navigate({ q: inputValue.trim(), page: '1' });
        }
    };

    const handleClear = () => {
        setInputValue('');
        navigate({ q: '', page: '1' });
        inputRef.current?.focus();
    };

    const handleRecentClick = (term: string) => {
        setInputValue(term);
        navigate({ q: term, page: '1' });
    };

    const handleClearRecent = () => {
        localStorage.removeItem(RECENT_KEY);
        setRecentSearches([]);
    };

    // Initial render — if no query, show search prompt
    const showSearchPrompt = !q && !loading && products.length === 0;

    return (
        <div className="min-h-screen bg-white">
            {/* Sticky Search Toolbar */}
            <div className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
                <div className="container py-3">
                    <form onSubmit={handleSearch} className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={t('placeholder')}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/50 placeholder:text-slate-400"
                                aria-label={t('placeholder')}
                            />
                            {inputValue && (
                                <button
                                    type="button"
                                    onClick={() => setInputValue('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 p-1 text-slate-500"
                                    aria-label="Tozalash"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-blue-700 active:scale-95"
                        >
                            <Search size={16} />
                            <span className="hidden sm:inline">{t('title')}</span>
                        </button>
                    </form>

                    {/* Toolbar: sort + filter + results count */}
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {q && (
                                <span className="text-xs font-bold text-slate-500">
                                    {t('results', { count: total })}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Sort dropdown */}
                            <div className="relative" ref={sortRef}>
                                <button
                                    onClick={() => setShowSort(!showSort)}
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
                                >
                                    <ArrowUpDown size={14} />
                                    <span className="hidden sm:inline">{t('sort')}</span>
                                    <ChevronDown size={12} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
                                </button>
                                {showSort && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
                                        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-2xl border border-slate-100 bg-white py-2 shadow-2xl">
                                            {SORT_OPTIONS.map((key) => {
                                                const value = key === 'recommended' ? '' : key;
                                                const isActive = (sort === key) || (key === 'recommended' && !sort);
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            navigate({ sort: value, page: '1' });
                                                            setShowSort(false);
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

                            {/* Filter button */}
                            <button
                                onClick={() => setShowFilters(true)}
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
                            >
                                <SlidersHorizontal size={14} />
                                <span className="hidden sm:inline">{t('filters')}</span>
                                {(categorySlug || minPrice || maxPrice || discountOnly) && (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white">
                                        {(categorySlug ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (discountOnly ? 1 : 0)}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container py-6">
                {/* No query — show search prompt + recent searches */}
                {showSearchPrompt && (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50">
                            <Search size={36} className="text-slate-300" />
                        </div>
                        <h2 className="mb-2 text-xl font-bold text-slate-900">{t('search_prompt')}</h2>
                        <p className="mb-8 max-w-sm text-sm font-medium text-slate-500">{t('search_prompt_desc')}</p>

                        {recentSearches.length > 0 && (
                            <div className="w-full max-w-md">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('recent_searches')}</span>
                                    <button onClick={handleClearRecent} className="text-xs font-medium text-slate-400 hover:text-slate-600">{t('clear_filters')}</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {recentSearches.map((term) => (
                                        <button
                                            key={term}
                                            onClick={() => handleRecentClick(term)}
                                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Loading state */}
                {loading && (
                    <div className="flex items-center justify-center py-24">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-blue-600" size={36} />
                            <span className="text-sm font-bold text-slate-500">{tHeader('loading')}</span>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {error && !loading && (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                            <X size={28} className="text-red-400" />
                        </div>
                        <p className="mb-2 text-lg font-bold text-slate-900">{t('no_results')}</p>
                        <p className="text-sm font-medium text-slate-500">{error}</p>
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && q && products.length === 0 && (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-50">
                            <Package size={40} className="text-slate-300" />
                        </div>
                        <h2 className="mb-2 text-xl font-bold text-slate-900">{t('no_results')}</h2>
                        <p className="mb-6 max-w-sm text-sm font-medium text-slate-500">{t('no_results_desc')}</p>
                        {recentSearches.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2">
                                {recentSearches.slice(0, 3).map((term) => (
                                    <button
                                        key={term}
                                        onClick={() => handleRecentClick(term)}
                                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Product grid */}
                {!loading && !error && products.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                            {products.map((p: any) => (
                                <ProductCard
                                    key={p.id}
                                    id={p.id}
                                    slug={p.slug}
                                    title={p.title}
                                    price={p.price}
                                    oldPrice={p.oldPrice}
                                    image={p.image}
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
                                    priority={false}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-10 flex items-center justify-center gap-2">
                                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => navigate({ page: String(p) })}
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all ${p === page ? 'bg-blue-600 text-white shadow-lg' : 'border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Filter drawer (mobile) / sidebar (desktop) */}
            {showFilters && (
                <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={t('filters')}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowFilters(false)} aria-hidden="true" />
                    <div className="relative w-full max-w-sm bg-white shadow-2xl lg:max-w-md pb-[env(safe-area-inset-bottom)]">
                        <div className="flex items-center justify-between border-b border-slate-100 p-5">
                            <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">{t('filters')}</h2>
                            <button onClick={() => setShowFilters(false)} className="rounded-xl p-2 hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6 overflow-y-auto p-5 pb-28">
                            {/* Category filter */}
                            <div>
                                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-900">{t('category')}</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => navigate({ category: '', page: '1' })}
                                        className={`flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${!categorySlug ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {t('all_categories')}
                                    </button>
                                    {categories.map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => navigate({ category: cat.slug, page: '1' })}
                                            className={`flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${categorySlug === cat.slug ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                            style={{ paddingLeft: cat.depth ? '2.5rem' : undefined }}
                                        >
                                            {cat.depth > 0 && <span className="mr-2 text-slate-300">└</span>}
                                            {cat.name}
                                        </button>
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
                                        value={minPrice}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const params = { minPrice: val, page: '1' };
                                            navigate(params);
                                        }}
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500"
                                    />
                                    <span className="text-slate-400">—</span>
                                    <input
                                        type="number"
                                        placeholder={t('max_price')}
                                        value={maxPrice}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const params = { maxPrice: val, page: '1' };
                                            navigate(params);
                                        }}
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Discount only */}
                            <div>
                                <label className="flex cursor-pointer items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={discountOnly}
                                        onChange={(e) => navigate({ discount: e.target.checked ? '1' : '', page: '1' })}
                                        className="h-5 w-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-bold text-slate-900">{t('discount_only')}</span>
                                </label>
                            </div>
                        </div>

                        {/* Bottom action bar */}
                        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white p-5">
                            <button
                                onClick={() => {
                                    navigate({ category: '', minPrice: '', maxPrice: '', discount: '', page: '1' });
                                    setShowFilters(false);
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-slate-800 active:scale-95"
                            >
                                {t('clear_filters')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}