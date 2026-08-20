"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight, ChevronLeft, LayoutGrid } from 'lucide-react';

/**
 * Katalog browser — URL = source of truth.
 * `/catalog` route'ida render bo'ladi.
 *
 * Level 0: root kategoriyalar ro'yxati
 * Level 1: tanlangan root ning children (drill-down)
 * Child bosilganda -> /category/{child-slug} sahifasiga o'tadi
 */
export default function CatalogBrowser() {
    const t = useTranslations('Catalog');
    const th = useTranslations('Header');
    const locale = useLocale();

    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoot, setSelectedRoot] = useState<any | null>(null);

    useEffect(() => {
        fetch('/api/categories')
            .then(r => r.json())
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const catHref = (slug: string) => `/${locale}/category/${slug}`;

    // Root bosilganda: children bor bo'lsa drill-down, aks holda <a> navigatsiya.
    const handleRootClick = (e: React.MouseEvent, root: any) => {
        if (root.children && root.children.length > 0) {
            e.preventDefault();
            setSelectedRoot(root);
        }
    };

    const handleBack = () => {
        setSelectedRoot(null);
    };

    return (
        <div className="min-h-screen bg-[#fafafb]">
            {/* Sticky header */}
            <div className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
                <div className="flex items-center gap-3 px-4 py-3">
                    {selectedRoot ? (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex items-center gap-1 p-2 -ml-2 text-slate-600 hover:text-blue-600"
                            aria-label={t('back')}
                        >
                            <ChevronLeft size={20} />
                            <span className="text-sm font-bold">{t('back')}</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={20} className="text-blue-600" />
                            <h1 className="text-lg font-black text-slate-900">{t('title')}</h1>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 py-4">
                {loading ? (
                    <div className="text-center py-16 text-sm font-bold text-slate-400">{th('loading')}</div>
                ) : selectedRoot ? (
                    // Level 1: children of selected root
                    <div className="flex flex-col gap-2">
                        <div className="mb-1 flex items-center justify-between rounded-2xl bg-white px-4 py-3 border border-slate-100">
                            <span className="text-sm font-bold text-slate-400">{selectedRoot.name}</span>
                        </div>
                        <a
                            href={catHref(selectedRoot.slug)}
                            className="flex items-center justify-between rounded-2xl bg-blue-600 px-4 py-4 text-white font-bold shadow-sm"
                        >
                            <span>{t('view_all')}</span>
                            <ChevronRight size={18} />
                        </a>
                        <div className="h-px bg-slate-100 my-2" />
                        {selectedRoot.children?.map((child: any) => (
                            <a
                                key={child.id}
                                href={catHref(child.slug)}
                                className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 border border-slate-100 shadow-sm active:scale-[0.99] transition-transform"
                            >
                                <span className="text-sm font-bold text-slate-800">{child.name}</span>
                                <ChevronRight size={18} className="text-slate-300" />
                            </a>
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-16 text-sm font-bold text-slate-400">{t('empty')}</div>
                ) : (
                    // Level 0: root categories
                    <div className="flex flex-col gap-2">
                        {categories.map((root: any) => (
                            <a
                                key={root.id}
                                href={catHref(root.slug)}
                                onClick={(e) => handleRootClick(e, root)}
                                className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 border border-slate-100 shadow-sm active:scale-[0.99] transition-transform"
                                style={{ textDecoration: 'none' }}
                            >
                                <span className="text-sm font-black text-slate-800">{root.name}</span>
                                <ChevronRight size={18} className="text-slate-300" />
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
