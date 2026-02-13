"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Loader2, Plus, Trash2, Edit2, UploadCloud,
    X, Image as ImageIcon, Search, CheckCircle2, XCircle,
    MousePointerClick, Eye, TrendingUp, BarChart3, ChevronRight,
    Folder
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface Banner {
    id: string;
    title: string;
    description?: string;
    image: string;
    link?: string;
    position: 'HOME_TOP' | 'HOME_SIDE';
    isActive: boolean;
    order: number;
    price?: number;
    oldPrice?: number;
    discount?: string;
    clickCount?: number;
    impressionCount?: number;
    startDate?: string;
    endDate?: string;
    variant?: string;
    productId?: string;
    targetCategoryId?: string;
    product?: { title: string; image: string };
    targetCategory?: { name: string; image: string };
}

const POSITIONS = [
    { value: 'HOME_TOP', label: 'Bosh Sahifa - Asosiy Slider (Chap qism)', dimensions: '1200x450' },
    { value: 'HOME_SIDE', label: 'Bosh Sahifa - Yon Promo Card (O\'ng qism)', dimensions: '400x400' },
];

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState('');
    const [link, setLink] = useState('');
    const [position, setPosition] = useState('HOME_TOP');
    const [isActive, setIsActive] = useState(true);
    const [order, setOrder] = useState('0');
    const [price, setPrice] = useState('');
    const [oldPrice, setOldPrice] = useState('');
    const [discount, setDiscount] = useState('');

    // Internal Linking Extension
    const [productId, setProductId] = useState<string | null>(null);
    const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [categoryResults, setCategoryResults] = useState<any[]>([]);
    const [isSearchingProduct, setIsSearchingProduct] = useState(false);
    const [isSearchingCategory, setIsSearchingCategory] = useState(false);

    const totalImpressions = banners.reduce((acc, b) => acc + (b.impressionCount || 0), 0);
    const totalClicks = banners.reduce((acc, b) => acc + (b.clickCount || 0), 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
    const activeBannersCount = banners.filter(b => b.isActive).length;

    // Auto-calculate discount
    useEffect(() => {
        const p = parseFloat(price);
        const op = parseFloat(oldPrice);
        if (p > 0 && op > 0 && op > p) {
            const calculated = Math.round(((op - p) / op) * 100);
            setDiscount(`-${calculated}%`);
        }
    }, [price, oldPrice]);

    useEffect(() => {
        fetchData();
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
                    setProductResults(data);
                }
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setIsSearchingProduct(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [productSearch]);

    // Search Categories
    useEffect(() => {
        if (categorySearch.length < 2) {
            setCategoryResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingCategory(true);
            try {
                const res = await fetch('/api/admin/categories');
                if (res.ok) {
                    const data = await res.json();
                    const filtered = data.filter((c: any) =>
                        c.name.toLowerCase().includes(categorySearch.toLowerCase())
                    );
                    setCategoryResults(filtered);
                }
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setIsSearchingCategory(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [categorySearch]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const bannersRes = await fetch('/api/admin/banners');

            if (bannersRes.ok) {
                setBanners(await bannersRes.json());
            }
        } catch (error) {
            toast.error("Ma'lumotlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', e.target.files[0]);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setImage(data.url);
                toast.success("Rasm yuklandi");
            } else {
                toast.error("Rasm yuklashda xatolik");
            }
        } catch (e) {
            toast.error("Xatolik yuz berdi");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editId ? `/api/admin/banners/${editId}` : '/api/admin/banners';
            const method = editId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    image,
                    link: link || null,
                    position,
                    isActive,
                    order: parseInt(order) || 0,
                    price: price ? parseFloat(price) : null,
                    oldPrice: oldPrice ? parseFloat(oldPrice) : null,
                    discount,
                    productId,
                    targetCategoryId
                })
            });

            if (res.ok) {
                toast.success(editId ? "Banner yangilandi" : "Banner yaratildi");
                resetForm();
                fetchData();
                setShowForm(false);
            } else {
                toast.error("Saqlashda xatolik");
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
        setPosition(banner.position);
        setIsActive(banner.isActive);
        setOrder(banner.order?.toString() || '0');
        setPrice(banner.price?.toString() || '');
        setOldPrice(banner.oldPrice?.toString() || '');
        setDiscount(banner.discount || '');
        setProductId(banner.productId || null);
        setTargetCategoryId(banner.targetCategoryId || null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
        try {
            const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Banner o'chirildi");
                fetchData();
            }
        } catch (e) {
            toast.error("Xatolik");
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
        setProductId(null);
        setTargetCategoryId(null);
        setProductSearch('');
        setCategorySearch('');
        setEditId(null);
    };


    const filteredBanners = banners.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Bannerlar Boshqaruvi</h1>
                    <p className="text-gray-500 mt-1">Reklama va e'lonlar uchun bannerlar tizimi</p>
                </div>
                <Button
                    onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 px-6"
                >
                    {showForm ? <X size={18} /> : <Plus size={18} />}
                    {showForm ? "Yopish" : "Yangi Banner"}
                </Button>
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
                                        <label className="text-sm font-bold text-gray-700 ml-1">Sarlavha (Title)</label>
                                        <input
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                            placeholder="Masalan: Yozgi chegirmalar"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Joylashuvi (Position)</label>
                                        <select
                                            value={position}
                                            onChange={e => setPosition(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none"
                                        >
                                            {POSITIONS.map(pos => (
                                                <option key={pos.value} value={pos.value}>{pos.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-blue-600 font-medium ml-1">Birinchi rasmdagi asosiy joylar: Slider (Chap tomonda katta) va Yon Promo (O'ng tomonda kichik)</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Tavsif (Description) - ixtiyoriy</label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium min-h-[100px]"
                                            placeholder="Banner uchun qo'shimcha matn (masalan, Slider uchun sarlavha ostidagi matn)"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Status</label>
                                        <div className="flex items-center gap-4">
                                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all ${isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}>
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    className="hidden"
                                                    checked={isActive}
                                                    onChange={() => setIsActive(true)}
                                                />
                                                <CheckCircle2 size={18} /> Faol
                                            </label>
                                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all ${!isActive ? 'bg-slate-50 border-slate-300 text-slate-700 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}>
                                                <input
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
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Narxi (Price)</label>
                                            <input
                                                type="number"
                                                value={price}
                                                onChange={e => setPrice(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                placeholder="Masalan: 549000"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Eski Narxi</label>
                                            <input
                                                type="number"
                                                value={oldPrice}
                                                onChange={e => setOldPrice(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                placeholder="Masalan: 819000"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Chegirma (masalan: -34%)</label>
                                            <input
                                                value={discount}
                                                onChange={e => setDiscount(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                placeholder="-34%"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Tartib (Order)</label>
                                            <input
                                                type="number"
                                                value={order}
                                                onChange={e => setOrder(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 relative">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Mahsulotga bog'lash</label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
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
                                                            }}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                                        >
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                                                                <img src={p.image} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-sm font-bold text-gray-900 line-clamp-1">{p.title}</p>
                                                                <p className="text-xs text-gray-500">{p.price.toLocaleString()} so'm</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {productId && (
                                                <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold w-fit">
                                                    <CheckCircle2 size={14} /> Biriktirilgan
                                                    <button onClick={() => { setProductId(null); setProductSearch(''); }} className="hover:text-red-500"><X size={14} /></button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 relative">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Kategoriyaga bog'lash</label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                    value={categorySearch}
                                                    onChange={e => setCategorySearch(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                    placeholder="Kategoriya qidirish..."
                                                />
                                                {isSearchingCategory && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16} />}
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
                                                                setCategoryResults([]);
                                                            }}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                                        >
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                                                                {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover" /> : <Folder className="text-gray-400" size={20} />}
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
                                                    <button onClick={() => { setTargetCategoryId(null); setCategorySearch(''); }} className="hover:text-red-500"><X size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Havola (Link) - ixtiyoriy</label>
                                        <input
                                            value={link}
                                            onChange={e => setLink(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                            placeholder="Masalan: /category/yozgi-chegirmalar"
                                        />
                                        <p className="text-xs text-gray-500 ml-1">Banner bosilganda qayerga o'tishi kerak</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Banner Rasmi</label>
                                        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200 h-full justify-center">
                                            {image ? (
                                                <div className="relative group w-full h-40">
                                                    <img src={image} alt="Preview" className="w-full h-full object-cover rounded-2xl shadow-md" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setImage('')}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 mb-2">
                                                        <ImageIcon size={32} />
                                                    </div>
                                                    <p className="text-xs text-gray-400">Rasm yuklash</p>
                                                    <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase tracking-wider">
                                                        Tavsiya: {POSITIONS.find(p => p.value === position)?.dimensions || '1200x450'}
                                                    </p>
                                                </div>
                                            )}
                                            <label className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all shadow-sm active:scale-95 flex items-center gap-2">
                                                {uploading ? <Loader2 className="animate-spin" size={14} /> : <UploadCloud size={14} />}
                                                {uploading ? "..." : "Tanlash"}
                                                <input type="file" hidden accept="image/*" onChange={handleUpload} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div className="flex gap-3 pt-6 border-t border-gray-50">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-2xl shadow-xl shadow-blue-200 font-bold"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                    {editId ? "Saqlash" : "Yarating"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowForm(false); resetForm(); }}
                                    className="h-12 px-8 rounded-2xl font-bold border-gray-200 text-gray-500 hover:bg-gray-50"
                                >
                                    Bekor qilish
                                </Button>
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
                                    <p className="text-sm font-medium text-gray-500">Faol bannerlar</p>
                                    <p className="text-2xl font-black text-gray-900">{activeBannersCount} / {banners.length}</p>
                                </div>
                            </motion.div>
                        </div>

                        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                            <div className="p-6 border-b border-gray-50">
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Bannerlarni qidirish..."
                                        className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                                    />
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
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Amallar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={10} className="text-center py-20 text-gray-400 font-medium">Yuklanmoqda...</td>
                                            </tr>
                                        ) : filteredBanners.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="text-center py-20 text-gray-400 font-medium">Bannerlar topilmadi</td>
                                            </tr>
                                        ) : (
                                            filteredBanners.map((banner) => (
                                                <tr key={banner.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="w-16 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                                            <img src={banner.image} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900 text-sm">{banner.title}</td>
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
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${banner.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {banner.isActive ? 'Faol' : 'Nofaol'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50"
                                                                onClick={() => handleEdit(banner)}
                                                            >
                                                                <Edit2 size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50"
                                                                onClick={() => handleDelete(banner.id)}
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
