"use client";


import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
    Loader2, Plus, Trash2, Edit2, UploadCloud,
    X, Image as ImageIcon, Search, CheckCircle2, XCircle, AlertTriangle,
    MousePointerClick, Eye, TrendingUp, BarChart3,
    Folder, ClipboardPaste, Layers, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RENDERED_BANNER_POSITIONS, type BannerPosition } from '@/lib/banner-schema';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface LinkedCategory {
    id: string;
    name: string;
    slug?: string;
}

interface Banner {
    id: string;
    title: string;
    description?: string;
    image: string;
    link?: string;
    /** Bazada 5 ta qiymat bo'lishi mumkin, ammo saytda faqat 3 tasi render bo'ladi. */
    position: BannerPosition;
    isActive: boolean;
    order: number;
    price?: number;
    oldPrice?: number;
    discount?: string;
    clickCount?: number;
    impressionCount?: number;
    startDate?: string;
    endDate?: string;
    productId?: string;
    targetCategoryId?: string;
    product?: { id: string; title: string; image: string; price: number };
    targetCategory?: { id: string; name: string; slug: string; image: string };
    /** Banner qaysi kategoriya sahifalarida ko'rinadi (M-N). */
    categories?: LinkedCategory[];
}

interface PositionMeta {
    value: (typeof RENDERED_BANNER_POSITIONS)[number];
    label: string;
    dimensions: string;
    /** Preview uchun CSS aspect-ratio. */
    aspect: string;
    /** Saytdagi qaysi joyda chiqadi — adminга tushunarli bo'lishi uchun. */
    surface: string;
    /** Shu joylashuvda narx/chegirma bloki render bo'ladimi. */
    usesPricing: boolean;
    /** Shu joylashuv kategoriyaga bog'lanishi shartmi. */
    needsCategories: boolean;
}

const POSITIONS: PositionMeta[] = [
    {
        value: 'HOME_TOP',
        label: 'Bosh Sahifa - Asosiy Slider (Chap qism)',
        dimensions: '1200x450',
        aspect: '1200 / 450',
        surface: 'Bosh sahifadagi katta slider. Rasm, sarlavha, tavsif va "Batafsil" tugmasi ko\'rinadi. Bir nechta banner qo\'shsangiz avtomatik almashib turadi (tartibni "Tartib" belgilaydi).',
        usesPricing: false,
        needsCategories: false
    },
    {
        value: 'HOME_SIDE',
        label: 'Bosh Sahifa - Yon Promo Card (O\'ng qism)',
        dimensions: '400x400',
        aspect: '1 / 1',
        surface: 'Bosh sahifaning o\'ng tomonidagi "Hot Deal" kartasi. Narx, eski narx, chegirma belgisi va tugash vaqti sanoq-taxtasi shu yerda ishlaydi. Saytda faqat BITTA yon banner ko\'rinadi — eng kichik tartib raqamli.',
        usesPricing: true,
        needsCategories: false
    },
    {
        value: 'CATEGORY_TOP',
        label: 'Kategoriya Sahifasi - Yuqori Banner',
        dimensions: '1200x250',
        aspect: '1200 / 250',
        surface: 'Kategoriya sahifasining yuqorisidagi karusel. Ko\'rinishi uchun pastdagi "Qaysi kategoriya sahifalarida ko\'rinadi" ro\'yxatidan kamida bitta kategoriya tanlanishi SHART.',
        usesPricing: false,
        needsCategories: true
    }
];

/** Prisma DateTime'ni datetime-local input formatiga (mahalliy vaqt) o'giradi. */
const toLocalInputValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const isImageUrl = (value: string) => {
    try {
        const url = new URL(value);
        if (!/^https?:$/.test(url.protocol)) return false;
        return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url.pathname) || /image/i.test(url.searchParams.toString());
    } catch {
        return false;
    }
};

/** Paste hodisasi matn maydonida bo'lsa — URL'ni banner rasmi deb olmaymiz. */
const isTypingTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
    const [cleaningUp, setCleaningUp] = useState(false);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState('');
    const [link, setLink] = useState('');
    const [position, setPosition] = useState<PositionMeta['value']>('HOME_TOP');
    const [isActive, setIsActive] = useState(true);
    const [order, setOrder] = useState('0');
    const [price, setPrice] = useState('');
    const [oldPrice, setOldPrice] = useState('');
    const [discount, setDiscount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    /** Chegirmani admin qo'lda o'zgartirgan bo'lsa avto-hisoblash bosib ketmasin. */
    const discountTouched = useRef(false);

    // Internal Linking Extension
    const [productId, setProductId] = useState<string | null>(null);
    const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [isSearchingProduct, setIsSearchingProduct] = useState(false);

    /** Barcha kategoriyalar bir marta yuklanadi — qidiruv shu ro'yxat ustida. */
    const [allCategories, setAllCategories] = useState<LinkedCategory[]>([]);
    const [categoriesLoaded, setCategoriesLoaded] = useState(false);
    /** Banner qaysi kategoriya sahifalarida ko'rinadi (M-N `categories`). */
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [categoryPickerSearch, setCategoryPickerSearch] = useState('');

    const positionMeta = useMemo(
        () => POSITIONS.find(p => p.value === position) ?? POSITIONS[0],
        [position]
    );

    const totalImpressions = banners.reduce((acc, b) => acc + (b.impressionCount || 0), 0);
    const totalClicks = banners.reduce((acc, b) => acc + (b.clickCount || 0), 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
    const activeBannersCount = banners.filter(b => b.isActive).length;
    const isBannerExpired = (b: Banner) => !!b.endDate && new Date(b.endDate).getTime() < Date.now();
    const isBannerScheduled = (b: Banner) => !!b.startDate && new Date(b.startDate).getTime() > Date.now();
    const expiredActiveCount = banners.filter(b => b.isActive && isBannerExpired(b)).length;

    /**
     * Banner haqiqatan saytda ko'rinadimi? Admin panel ilgari faqat
     * isActive'ni ko'rsatardi — natijada "Faol" deb turgan banner sayt
     * tomonida bir necha sababdan ko'rinmasligi mumkin edi.
     */
    const invisibleReason = (b: Banner): string | null => {
        if (!b.isActive) return 'Nofaol';
        if (isBannerExpired(b)) return 'Muddati o\'tgan';
        if (isBannerScheduled(b)) return 'Hali boshlanmagan';
        if (!RENDERED_BANNER_POSITIONS.includes(b.position as any)) {
            return `"${b.position}" joylashuvi saytda ishlatilmaydi`;
        }
        if (b.position === 'CATEGORY_TOP' && (b.categories?.length ?? 0) === 0) {
            return 'Kategoriya tanlanmagan';
        }
        return null;
    };

    /** Haqiqatan saytda chiqadigan bannerlar soni. */
    const visibleBannersCount = banners.filter(b => invisibleReason(b) === null).length;

    // Auto-calculate discount
    useEffect(() => {
        if (discountTouched.current) return;
        const p = parseFloat(price);
        const op = parseFloat(oldPrice);
        if (p > 0 && op > 0 && op > p) {
            setDiscount(`-${Math.round(((op - p) / op) * 100)}%`);
        } else if (!price && !oldPrice) {
            // Narxlar tozalanganda eski chegirma osilib qolmasin
            setDiscount('');
        }
    }, [price, oldPrice]);

    useEffect(() => {
        fetchData();
        fetchCategories();
    }, []);

    // Search Products
    useEffect(() => {
        if (productSearch.length < 2) {
            setProductResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingProduct(true);
            try {
                const res = await fetch(`/api/products?q=${encodeURIComponent(productSearch)}`);
                if (res.ok) {
                    const data = await res.json();
                    setProductResults(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setIsSearchingProduct(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [productSearch]);

    // Kategoriyalar bir marta yuklanadi, qidiruv klient tomonda filtrlaydi —
    // ilgari har bir harf uchun butun kategoriya ro'yxati qaytadan olinardi.
    const categoryResults = useMemo(() => {
        const q = categorySearch.trim().toLowerCase();
        if (q.length < 2) return [];
        return allCategories.filter(c => c.name.toLowerCase().includes(q)).slice(0, 20);
    }, [categorySearch, allCategories]);

    const pickerResults = useMemo(() => {
        const q = categoryPickerSearch.trim().toLowerCase();
        const pool = q ? allCategories.filter(c => c.name.toLowerCase().includes(q)) : allCategories;
        return pool.slice(0, 40);
    }, [categoryPickerSearch, allCategories]);

    const selectedCategories = useMemo(
        () => categoryIds.map(id => allCategories.find(c => c.id === id)).filter(Boolean) as LinkedCategory[],
        [categoryIds, allCategories]
    );

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories');
            if (res.ok) {
                const data = await res.json();
                setAllCategories(Array.isArray(data) ? data.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })) : []);
            }
        } catch (err) {
            console.error('Categories fetch error:', err);
        } finally {
            setCategoriesLoaded(true);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const bannersRes = await fetch('/api/admin/banners');

            if (bannersRes.ok) {
                setBanners(await bannersRes.json());
            } else {
                toast.error("Bannerlarni yuklashda xatolik");
            }
        } catch (error) {
            toast.error("Ma'lumotlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const uploadOne = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
            throw new Error(data?.error || 'Yuklash amalga oshmadi');
        }
        return data.url as string;
    };

    /**
     * Fayl tanlash, drag&drop va paste — hammasi shu funksiyaga keladi.
     * Tur va hajm tekshiriladi; banner bitta rasmdan iborat bo'lgani uchun
     * bir nechta fayl tashlansa birinchisi olinadi va admin ogohlantiriladi.
     */
    const handleFiles = useCallback(async (input: FileList | File[] | null) => {
        const files = Array.from(input || []);
        if (files.length === 0) return;

        if (files.length > 1) {
            toast.info(`${files.length} ta fayl tashlandi — banner uchun faqat birinchisi olinadi`);
        }

        const file = files[0];
        if (!file.type.startsWith('image/')) {
            toast.error(`${file.name}: faqat rasm fayllari yuklanadi`);
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            toast.error(`${file.name}: rasm hajmi 10MB dan oshmasligi kerak`);
            return;
        }

        setUploading(true);
        try {
            const url = await uploadOne(file);
            if (url) {
                setImage(url);
                toast.success("Rasm yuklandi");
            }
        } catch (err: any) {
            toast.error(err?.message || "Rasm yuklashda xatolik");
        } finally {
            setUploading(false);
        }
    }, []);

    // Ctrl/Cmd+V bilan rasm yoki rasm havolasini qo'yish
    useEffect(() => {
        if (!showForm) return;

        const onPaste = (event: ClipboardEvent) => {
            const clip = event.clipboardData;
            if (!clip) return;

            const imageFiles = Array.from(clip.files || []).filter(f => f.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                event.preventDefault();
                void handleFiles(imageFiles);
                return;
            }

            // Matn maydoniga yozayotgan bo'lsa aralashmaymiz
            if (isTypingTarget(event.target)) return;

            const text = (clip.getData('text') || '').trim();
            if (!text || !isImageUrl(text)) return;
            event.preventDefault();
            setImage(text);
            toast.success("Rasm havolasi qo'yildi");
        };

        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [showForm, handleFiles]);

    /** Saqlashdan oldingi klient tomon tekshiruvi — server ham xuddi shuni tekshiradi. */
    const validate = (): string | null => {
        if (title.trim().length < 2) return "Sarlavha kamida 2 harf bo'lishi kerak";
        if (!image) return "Banner rasmi majburiy — rasm yuklang yoki havola qo'ying";
        if (positionMeta.needsCategories && categoryIds.length === 0) {
            return "Kategoriya banneri uchun kamida bitta kategoriya tanlanishi kerak — aks holda saytda ko'rinmaydi";
        }
        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
            return "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak";
        }
        const p = parseFloat(price);
        const op = parseFloat(oldPrice);
        if (p > 0 && op > 0 && op <= p) return "Eski narx yangi narxdan katta bo'lishi kerak";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const error = validate();
        if (error) {
            toast.error(error);
            return;
        }

        setSubmitting(true);
        try {
            const url = editId ? `/api/admin/banners/${editId}` : '/api/admin/banners';
            const method = editId ? 'PATCH' : 'POST';

            // Narx/chegirma bloki faqat yon promo kartada render bo'ladi —
            // boshqa joylashuvlar uchun bazaga saqlamaymiz.
            const pricingApplies = positionMeta.usesPricing;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null,
                    image,
                    link: link.trim() || null,
                    position,
                    isActive,
                    order: parseInt(order) || 0,
                    price: pricingApplies && price ? parseFloat(price) : null,
                    oldPrice: pricingApplies && oldPrice ? parseFloat(oldPrice) : null,
                    discount: pricingApplies ? (discount.trim() || null) : null,
                    startDate: startDate || null,
                    endDate: endDate || null,
                    productId,
                    targetCategoryId,
                    categoryIds
                })
            });

            if (res.ok) {
                toast.success(editId ? "Banner yangilandi" : "Banner yaratildi");
                resetForm();
                fetchData();
                setShowForm(false);
            } else {
                const data = await res.json().catch(() => ({}));
                const details = data?.details
                    ? Object.values(data.details as Record<string, string[]>).flat().join('; ')
                    : '';
                toast.error(details || data?.error || "Saqlashda xatolik");
            }
        } catch (e) {
            toast.error("Xatolik");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (banner: Banner) => {
        setEditId(banner.id);
        setTitle(banner.title);
        setDescription(banner.description || '');
        setImage(banner.image || '');
        setLink(banner.link || '');
        // Bazada saytda ishlatilmaydigan joylashuv bo'lsa forma buzilmasin
        setPosition(
            RENDERED_BANNER_POSITIONS.includes(banner.position as any)
                ? (banner.position as PositionMeta['value'])
                : 'HOME_TOP'
        );
        setIsActive(banner.isActive);
        setOrder(banner.order?.toString() || '0');
        setPrice(banner.price?.toString() || '');
        setOldPrice(banner.oldPrice?.toString() || '');
        setDiscount(banner.discount || '');
        discountTouched.current = !!banner.discount;
        setStartDate(toLocalInputValue(banner.startDate));
        setEndDate(toLocalInputValue(banner.endDate));
        setProductId(banner.productId || null);
        setTargetCategoryId(banner.targetCategoryId || null);
        // Bog'langan mahsulot/kategoriya nomlari qidiruv maydonlarida ko'rinadi
        setProductSearch(banner.product?.title || '');
        setCategorySearch(banner.targetCategory?.name || '');
        setCategoryIds((banner.categories || []).map(c => c.id));
        setCategoryPickerSearch('');
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
        try {
            const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Banner o'chirildi");
                // Tahrirlanayotgan banner o'chirilsa forma osilib qolmasin
                if (editId === id) {
                    resetForm();
                    setShowForm(false);
                }
                fetchData();
            } else {
                toast.error("O'chirishda xatolik");
            }
        } catch (e) {
            toast.error("Xatolik");
        }
    };

    const handleDeactivateExpired = async () => {
        if (!confirm("Muddati o'tgan faol bannerlar yopilsinmi (isActive=false)?")) return;
        setCleaningUp(true);
        try {
            const res = await fetch('/api/admin/banners/expired', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.count > 0
                    ? `${data.count} ta muddati o'tgan banner yopildi`
                    : "Muddati o'tgan faol banner topilmadi");
                fetchData();
            } else {
                toast.error("Xatolik yuz berdi");
            }
        } catch (e) {
            toast.error("Xatolik yuz berdi");
        } finally {
            setCleaningUp(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setImage('');
        setLink('');
        setPosition('HOME_TOP');
        setIsActive(true);
        setOrder('0');
        setPrice('');
        setOldPrice('');
        setDiscount('');
        discountTouched.current = false;
        setStartDate('');
        setEndDate('');
        setProductId(null);
        setTargetCategoryId(null);
        setProductSearch('');
        setCategorySearch('');
        setCategoryIds([]);
        setCategoryPickerSearch('');
        setEditId(null);
    };

    const toggleCategory = (id: string) => {
        setCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };


    const filteredBanners = banners.filter(b => {
        if (!b.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        switch (statusFilter) {
            case 'active': return b.isActive;
            case 'inactive': return !b.isActive;
            case 'expired': return isBannerExpired(b);
            default: return true;
        }
    });

    return (
        <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Bannerlar Boshqaruvi</h1>
                    <p className="text-gray-500 mt-1">Reklama va e'lonlar uchun bannerlar tizimi</p>
                </div>
                <div className="flex items-center gap-3">
                    {expiredActiveCount > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleDeactivateExpired}
                            disabled={cleaningUp}
                            className="gap-2 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 px-5"
                            title="endDate o'tgan faol bannerlarni isActive=false qilish"
                        >
                            {cleaningUp ? <Loader2 size={18} className="animate-spin" /> : <AlertTriangle size={18} />}
                            {cleaningUp ? "Yopilmoqda..." : `Muddati o'tganlarni yopish (${expiredActiveCount})`}
                        </Button>
                    )}
                    <Button
                        onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 px-6"
                        aria-label={showForm ? "Formani yopish" : "Yangi banner qo'shish"}
                    >
                        {showForm ? <X size={18} /> : <Plus size={18} />}
                        {showForm ? "Yopish" : "Yangi Banner"}
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white p-8 rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/50"
                    >
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            {editId ? <Edit2 className="text-blue-600" size={24} /> : <ImageIcon className="text-blue-600" size={24} />}
                            {editId ? 'Banner tahrirlash' : 'Yangi banner qo\'shish'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="banner-title" className="text-sm font-bold text-gray-700 ml-1">Sarlavha (Title)</label>
                                        <input
                                            id="banner-title"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                            placeholder="Masalan: Yozgi chegirmalar"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="banner-position" className="text-sm font-bold text-gray-700 ml-1">Joylashuvi (Position)</label>
                                        <select
                                            id="banner-position"
                                            value={position}
                                            onChange={e => setPosition(e.target.value as PositionMeta['value'])}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none"
                                            title="Banner joylashuvini tanlang"
                                            aria-label="Banner joylashuvi"
                                        >
                                            {POSITIONS.map(pos => (
                                                <option key={pos.value} value={pos.value}>{pos.label}</option>
                                            ))}
                                        </select>
                                        {/* Har bir joylashuv saytda aynan nima qilishini tushuntiradi —
                                            ilgari admin qaysi maydon qayerda chiqishini bilmasdi. */}
                                        <div className="flex gap-2 items-start p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                                            <Info size={14} className="text-blue-600 mt-0.5 flex-none" />
                                            <p className="text-[11px] leading-relaxed text-blue-800 font-medium">
                                                {positionMeta.surface}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="banner-description" className="text-sm font-bold text-gray-700 ml-1">Tavsif (Description) - ixtiyoriy</label>
                                        <textarea
                                            id="banner-description"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium min-h-[100px]"
                                            placeholder="Sarlavha ostida chiqadigan matn"
                                        />
                                        <p className="text-xs text-gray-500 ml-1">
                                            {positionMeta.value === 'HOME_SIDE'
                                                ? "Yon promo kartada tavsif ko'rinmaydi — bu joyni sarlavha, narx va sanoq-taxta egallaydi."
                                                : "Saytda sarlavha ostida, 2 qatorga qisqartirilgan holda chiqadi."}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-sm font-bold text-gray-700 ml-1">Status</span>
                                        <div className="flex items-center gap-4">
                                            <label htmlFor="status-active" className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all ${isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}>
                                                <input
                                                    id="status-active"
                                                    type="radio"
                                                    name="status"
                                                    className="hidden"
                                                    checked={isActive}
                                                    onChange={() => setIsActive(true)}
                                                />
                                                <CheckCircle2 size={18} /> Faol
                                            </label>
                                            <label htmlFor="status-inactive" className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all ${!isActive ? 'bg-slate-50 border-slate-300 text-slate-700 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}>
                                                <input
                                                    id="status-inactive"
                                                    type="radio"
                                                    name="status"
                                                    className="hidden"
                                                    checked={!isActive}
                                                    onChange={() => setIsActive(false)}
                                                />
                                                <XCircle size={18} /> Nofaol
                                            </label>
                                        </div>
                                    </div>

                                    {/*
                                      Kategoriya sahifasi banneri M-N `categories` bog'lanishi
                                      orqali chiqadi. Ilgari formada bu boshqaruv yo'q edi —
                                      shu sababli "Kategoriya Sahifasi" tanlangan banner
                                      saytda hech qachon ko'rinmasdi.
                                    */}
                                    {positionMeta.needsCategories && (
                                        <div className="space-y-2">
                                            <label htmlFor="banner-category-picker" className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                                                <Layers size={15} className="text-blue-600" />
                                                Qaysi kategoriya sahifalarida ko'rinadi
                                                <span className="text-red-500">*</span>
                                            </label>

                                            {selectedCategories.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-1">
                                                    {selectedCategories.map(cat => (
                                                        <span key={cat.id} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold">
                                                            {cat.name}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCategory(cat.id)}
                                                                className="hover:text-red-500"
                                                                title="Olib tashlash"
                                                                aria-label={`${cat.name} kategoriyasini olib tashlash`}
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                    id="banner-category-picker"
                                                    value={categoryPickerSearch}
                                                    onChange={e => setCategoryPickerSearch(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                    placeholder="Kategoriya nomi bo'yicha filtrlash..."
                                                />
                                            </div>

                                            <div className="max-h-48 overflow-y-auto rounded-2xl border border-gray-200 divide-y divide-gray-50">
                                                {!categoriesLoaded ? (
                                                    <p className="p-4 text-xs text-gray-400 font-medium flex items-center gap-2">
                                                        <Loader2 size={14} className="animate-spin" /> Kategoriyalar yuklanmoqda...
                                                    </p>
                                                ) : pickerResults.length === 0 ? (
                                                    <p className="p-4 text-xs text-gray-400 font-medium">Kategoriya topilmadi</p>
                                                ) : (
                                                    pickerResults.map(cat => (
                                                        <label
                                                            key={cat.id}
                                                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={categoryIds.includes(cat.id)}
                                                                onChange={() => toggleCategory(cat.id)}
                                                                className="w-4 h-4 rounded accent-blue-600"
                                                            />
                                                            <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>

                                            {categoryIds.length === 0 && (
                                                <p className="text-xs text-red-500 font-bold ml-1 flex items-center gap-1.5">
                                                    <AlertTriangle size={13} />
                                                    Kamida bitta kategoriya tanlanmasa banner saytda ko'rinmaydi
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {/*
                                      Narx, eski narx va chegirma saytda FAQAT yon promo
                                      kartada render bo'ladi. Ilgari bu maydonlar har qanday
                                      joylashuvda ko'rinardi — admin to'ldirardi, sayt esa
                                      e'tiborsiz qoldirardi.
                                    */}
                                    {positionMeta.usesPricing ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label htmlFor="banner-price" className="text-sm font-bold text-gray-700 ml-1">Narxi (Price)</label>
                                                    <input
                                                        id="banner-price"
                                                        type="number"
                                                        min="0"
                                                        value={price}
                                                        onChange={e => setPrice(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                        placeholder="Masalan: 549000"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="banner-old-price" className="text-sm font-bold text-gray-700 ml-1">Eski Narxi</label>
                                                    <input
                                                        id="banner-old-price"
                                                        type="number"
                                                        min="0"
                                                        value={oldPrice}
                                                        onChange={e => setOldPrice(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                        placeholder="Masalan: 819000"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label htmlFor="banner-discount" className="text-sm font-bold text-gray-700 ml-1">Chegirma belgisi (masalan: -34%)</label>
                                                <input
                                                    id="banner-discount"
                                                    value={discount}
                                                    onChange={e => { discountTouched.current = true; setDiscount(e.target.value); }}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                    placeholder="-34%"
                                                />
                                                <p className="text-xs text-gray-500 ml-1">
                                                    Ikki narx kiritilsa avtomatik hisoblanadi. Rasm ustidagi qizil belgi shu matnni ko'rsatadi.
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex gap-2 items-start p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                            <Info size={14} className="text-gray-400 mt-0.5 flex-none" />
                                            <p className="text-[11px] leading-relaxed text-gray-500 font-medium">
                                                Narx, eski narx va chegirma belgisi faqat <b>Yon Promo Card</b> joylashuvida
                                                ko'rinadi, shu sababli bu joylashuv uchun so'ralmaydi.
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="banner-order" className="text-sm font-bold text-gray-700 ml-1">Tartib (Order)</label>
                                            <input
                                                id="banner-order"
                                                type="number"
                                                min="0"
                                                value={order}
                                                onChange={e => setOrder(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                placeholder="0"
                                            />
                                            <p className="text-xs text-gray-500 ml-1">Kichik raqam oldin chiqadi</p>
                                        </div>
                                        <div className="space-y-2">
                                            {/* startDate site tomonida allaqachon filtrlanadi
                                                (getCachedBanners + kategoriya sahifasi), ammo
                                                formada maydon yo'q edi — ya'ni bannerni oldindan
                                                rejalashtirish imkonsiz edi. */}
                                            <label htmlFor="banner-start-date" className="text-sm font-bold text-gray-700 ml-1">Boshlanish vaqti</label>
                                            <input
                                                id="banner-start-date"
                                                type="datetime-local"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                title="Banner qachondan boshlab ko'rinishi"
                                            />
                                            <p className="text-xs text-gray-500 ml-1">Bo'sh = darhol ko'rinadi</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="banner-end-date" className="text-sm font-bold text-gray-700 ml-1">Tugash vaqti (End Date)</label>
                                        <input
                                            id="banner-end-date"
                                            type="datetime-local"
                                            value={endDate}
                                            min={startDate || undefined}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                            title="Banner qachon to'xtashi"
                                        />
                                        <p className="text-xs text-gray-500 ml-1">
                                            {positionMeta.usesPricing
                                                ? "Bo'sh = muddatsiz. To'ldirilsa yon kartada sanoq-taxta (soat:minut:sekund) chiqadi."
                                                : "Bo'sh = muddatsiz. Vaqt o'tgach banner saytda avtomatik ko'rinmaydi."}
                                        </p>
                                        {endDate && new Date(endDate).getTime() < Date.now() && (
                                            <p className="text-xs text-red-500 font-bold ml-1 flex items-center gap-1.5">
                                                <AlertTriangle size={13} />
                                                Bu vaqt allaqachon o'tgan — banner saytda ko'rinmaydi
                                            </p>
                                        )}
                                    </div>

                                    {/*
                                      Bu ikki boshqaruv "banner bosilganda qayerga o'tadi"ni
                                      belgilaydi (yuqoridagi kategoriya ro'yxati esa "qayerda
                                      ko'rinadi" — ular boshqa-boshqa narsa).
                                    */}
                                    <div className="space-y-2">
                                        <span className="text-sm font-bold text-gray-700 ml-1">Banner bosilganda qayerga o'tadi</span>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2 relative">
                                                <label htmlFor="banner-product-search" className="text-xs font-bold text-gray-500 ml-1">Mahsulotga bog'lash</label>
                                                <div className="relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                    <input
                                                        id="banner-product-search"
                                                        value={productSearch}
                                                        onChange={e => setProductSearch(e.target.value)}
                                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                        placeholder="Mahsulot nomini qidirish..."
                                                    />
                                                    {isSearchingProduct && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16} />}
                                                </div>

                                                {productResults.length > 0 && (
                                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                                        {productResults.map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setProductId(p.id);
                                                                    setLink(`/product/${p.id}`);
                                                                    setProductSearch(p.title);
                                                                    setProductResults([]);
                                                                    // Bitta banner ikki joyga o'tolmaydi
                                                                    setTargetCategoryId(null);
                                                                    setCategorySearch('');
                                                                }}
                                                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                                            >
                                                                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                                                                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{p.title}</p>
                                                                    <p className="text-xs text-gray-500">{Number(p.price || 0).toLocaleString()} so'm</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {productId && (
                                                    <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold w-fit">
                                                        <CheckCircle2 size={14} /> Biriktirilgan
                                                        <button
                                                            type="button"
                                                            onClick={() => { setProductId(null); setProductSearch(''); }}
                                                            className="hover:text-red-500"
                                                            title="O'chirish"
                                                            aria-label="Mahsulotni olib tashlash"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2 relative">
                                                <label htmlFor="banner-category-search" className="text-xs font-bold text-gray-500 ml-1">Kategoriyaga bog'lash</label>
                                                <div className="relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                    <input
                                                        id="banner-category-search"
                                                        value={categorySearch}
                                                        onChange={e => setCategorySearch(e.target.value)}
                                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                        placeholder="Kategoriya qidirish..."
                                                    />
                                                    {!categoriesLoaded && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16} />}
                                                </div>

                                                {categoryResults.length > 0 && (
                                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                                        {categoryResults.map(c => (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setTargetCategoryId(c.id);
                                                                    setLink(`/category/${c.slug}`);
                                                                    setCategorySearch(c.name);
                                                                    setProductId(null);
                                                                    setProductSearch('');
                                                                }}
                                                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                                            >
                                                                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                                                                    <Folder className="text-gray-400" size={20} />
                                                                </div>
                                                                <div className="text-left font-bold text-gray-900">
                                                                    {c.name}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {targetCategoryId && (
                                                    <div className="flex items-center gap-2 mt-2 p-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold w-fit">
                                                        <CheckCircle2 size={14} /> Biriktirilgan
                                                        <button
                                                            type="button"
                                                            onClick={() => { setTargetCategoryId(null); setCategorySearch(''); }}
                                                            className="hover:text-red-500"
                                                            title="O'chirish"
                                                            aria-label="Kategoriyani olib tashlash"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="banner-link" className="text-sm font-bold text-gray-700 ml-1">Havola (Link) - ixtiyoriy</label>
                                        <input
                                            id="banner-link"
                                            value={link}
                                            onChange={e => setLink(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                            placeholder="Masalan: /category/yozgi-chegirmalar"
                                        />
                                        <p className="text-xs text-gray-500 ml-1">
                                            Yuqoridagi qidiruvlardan tanlaganda avtomatik to'ladi. Qo'lda ham yozish mumkin
                                            {positionMeta.usesPricing && " (mahsulot biriktirilgan bo'lsa yon kartada mahsulot havolasi ustun turadi)"}.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">
                                            Banner Rasmi <span className="text-red-500">*</span>
                                        </label>
                                        {/*
                                          Yuklash uchun uch yo'l: tugma, faylni tashlash (drag&drop)
                                          va Ctrl/Cmd+V bilan qo'yish. Tur va hajm tekshiriladi.
                                        */}
                                        <div
                                            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                            onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
                                            onDrop={e => {
                                                e.preventDefault();
                                                setDragActive(false);
                                                void handleFiles(e.dataTransfer?.files ?? null);
                                            }}
                                            className={`flex flex-col items-center gap-4 p-6 rounded-3xl border border-dashed transition-colors ${
                                                dragActive
                                                    ? 'bg-blue-50 border-blue-400'
                                                    : image
                                                        ? 'bg-gray-50 border-gray-200'
                                                        : 'bg-gray-50 border-gray-300'
                                            }`}
                                        >
                                            {image ? (
                                                <div className="w-full space-y-2">
                                                    {/* Preview aynan shu joylashuvning nisbatida —
                                                        rasm saytda kesilib ketishini oldindan ko'rsatadi */}
                                                    <div className="relative group w-full">
                                                        <div
                                                            className="w-full overflow-hidden rounded-2xl shadow-md bg-white"
                                                            style={{ aspectRatio: positionMeta.aspect }}
                                                        >
                                                            <img
                                                                src={image}
                                                                alt="Banner ko'rinishi"
                                                                className="w-full h-full object-cover"
                                                                onError={() => toast.error("Rasm havolasi ochilmadi — manzilni tekshiring")}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setImage('')}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                                            title="Rasmni o'chirish"
                                                            aria-label="Tanlangan rasmni o'chirish"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-center text-gray-400 font-medium">
                                                        Saytdagi nisbat ({positionMeta.dimensions}) bo'yicha ko'rinish
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 mb-2">
                                                        {uploading ? <Loader2 size={28} className="animate-spin text-blue-500" /> : <ImageIcon size={32} />}
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-500">
                                                        {dragActive ? "Faylni shu yerga tashlang" : "Rasmni tashlang, tanlang yoki Ctrl+V bosing"}
                                                    </p>
                                                    <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase tracking-wider">
                                                        Tavsiya: {positionMeta.dimensions} · maks 10MB
                                                    </p>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                                <label htmlFor="banner-file-input" className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all shadow-sm active:scale-95 flex items-center gap-2">
                                                    {uploading ? <Loader2 className="animate-spin" size={14} /> : <UploadCloud size={14} />}
                                                    {uploading ? "Yuklanmoqda..." : image ? "Almashtirish" : "Tanlash"}
                                                    <input
                                                        id="banner-file-input"
                                                        type="file"
                                                        hidden
                                                        accept="image/*"
                                                        onChange={e => {
                                                            void handleFiles(e.target.files);
                                                            // Bir xil faylni qayta tanlash ishlashi uchun
                                                            e.target.value = '';
                                                        }}
                                                        title="Banner rasmini tanlang"
                                                    />
                                                </label>
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    <ClipboardPaste size={12} /> Ctrl+V ham ishlaydi
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div className="flex gap-3 pt-6 border-t border-gray-50 items-center">
                                <Button
                                    type="submit"
                                    disabled={submitting || uploading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-2xl shadow-xl shadow-blue-200 font-bold disabled:opacity-60"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                    {submitting ? "Saqlanmoqda..." : editId ? "Saqlash" : "Yarating"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowForm(false); resetForm(); }}
                                    className="h-12 px-8 rounded-2xl font-bold border-gray-200 text-gray-500 hover:bg-gray-50"
                                >
                                    Bekor qilish
                                </Button>
                                {uploading && (
                                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                                        <Loader2 size={13} className="animate-spin" /> Rasm yuklanmoqda, kuting...
                                    </span>
                                )}
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {!showForm && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Eye size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Jami ko'rishlar</p>
                                    <p className="text-2xl font-black text-gray-900">{totalImpressions.toLocaleString()}</p>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                                    <MousePointerClick size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Jami bosishlar</p>
                                    <p className="text-2xl font-black text-gray-900">{totalClicks.toLocaleString()}</p>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">O'rtacha CTR</p>
                                    <p className="text-2xl font-black text-gray-900">{avgCTR}%</p>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                                    <BarChart3 size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Saytda ko'rinadi</p>
                                    <p className="text-2xl font-black text-gray-900">{visibleBannersCount} / {banners.length}</p>
                                    {activeBannersCount > visibleBannersCount && (
                                        <p className="text-[11px] font-bold text-red-500 mt-0.5">
                                            {activeBannersCount - visibleBannersCount} ta &quot;faol&quot; banner ko&apos;rinmaydi
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                            <div className="p-6 border-b border-gray-50">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
                            <div className="relative w-full lg:w-80">
                                <label htmlFor="banners-search" className="sr-only">Bannerlarni qidirish</label>
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    id="banners-search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Bannerlarni qidirish..."
                                    className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {([['all', 'Hammasi'], ['active', 'Faol'], ['inactive', 'Nofaol'], ['expired', 'Muddati o\'tgan']] as const).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setStatusFilter(value)}
                                        title={`${label} bannerlar`}
                                        aria-pressed={statusFilter === value}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                            statusFilter === value
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Rasm</th>
                                            <th className="px-6 py-4">Sarlavha</th>
                                            <th className="px-6 py-4">Joylashuv</th>
                                            <th className="px-6 py-4 text-center">📊 Clicks</th>
                                            <th className="px-6 py-4 text-center">👁️ Views</th>
                                            <th className="px-6 py-4 text-center">📈 CTR</th>
                                            <th className="px-6 py-4 text-center">Saytdagi holati</th>
                                            <th className="px-6 py-4 text-right">Amallar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={8} className="text-center py-20 text-gray-400 font-medium">Yuklanmoqda...</td>
                                            </tr>
                                        ) : filteredBanners.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="text-center py-20 text-gray-400 font-medium">Bannerlar topilmadi</td>
                                            </tr>
                                        ) : (
                                            filteredBanners.map((banner) => (
                                                <tr key={banner.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="w-16 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                                            <img src={banner.image} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-900 text-sm">{banner.title}</p>
                                                        {/* Kategoriya banneri qaysi sahifalarda ko'rinishi */}
                                                        {banner.position === 'CATEGORY_TOP' && (
                                                            <p className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center gap-1">
                                                                <Layers size={11} />
                                                                {banner.categories?.length
                                                                    ? banner.categories.map(c => c.name).join(', ')
                                                                    : <span className="text-red-500">kategoriya tanlanmagan</span>}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                                                            {POSITIONS.find(p => p.value === banner.position)?.label || banner.position}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-bold text-blue-600">{banner.clickCount || 0}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-bold text-purple-600">{banner.impressionCount || 0}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {(() => {
                                                            const ctr = banner.impressionCount && banner.impressionCount > 0
                                                                ? ((banner.clickCount || 0) / banner.impressionCount * 100).toFixed(1)
                                                                : '0.0';
                                                            const ctrNum = parseFloat(ctr);
                                                            return (
                                                                <span className={`font-bold ${ctrNum >= 5 ? 'text-green-600' :
                                                                    ctrNum >= 2 ? 'text-yellow-600' :
                                                                        'text-gray-400'
                                                                    }`}>
                                                                    {ctr}%
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>

                                                    <td className="px-6 py-4 text-center">
                                                        {/*
                                                          Ilgari faqat isActive ko'rsatilardi — "Faol" deb
                                                          turgan banner sayt tomonida bir necha sababdan
                                                          (muddat, boshlanish vaqti, kategoriya tanlanmagani)
                                                          ko'rinmasligi mumkin edi va admin buni bilmasdi.
                                                        */}
                                                        {(() => {
                                                            const reason = invisibleReason(banner);
                                                            if (!reason) {
                                                                return (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700">
                                                                        <CheckCircle2 size={11} /> Saytda
                                                                    </span>
                                                                );
                                                            }
                                                            const isJustOff = reason === 'Nofaol';
                                                            return (
                                                                <span
                                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                                                                        isJustOff ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'
                                                                    }`}
                                                                    title={`Saytda ko'rinmaydi: ${reason}`}
                                                                >
                                                                    {!isJustOff && <AlertTriangle size={11} />}
                                                                    {reason}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50"
                                                                onClick={() => handleEdit(banner)}
                                                                title="Tahrirlash"
                                                                aria-label="Bannerni tahrirlash"
                                                            >
                                                                <Edit2 size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50"
                                                                onClick={() => handleDelete(banner.id)}
                                                                title="O'chirish"
                                                                aria-label="Bannerni o'chirish"
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
