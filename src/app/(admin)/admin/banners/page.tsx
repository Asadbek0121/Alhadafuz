"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, X, UploadCloud, Edit2, Trash2,
    Search, Filter, LayoutGrid, List as ListIcon,
    Loader2, ImageIcon, ExternalLink, Eye, EyeOff,
    Monitor, Smartphone, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type Banner = {
    id: string;
    type: 'MAIN' | 'SIDE';
    title: string;
    description: string;
    imageUrl: string;
    link: string;
    price: number | null;
    oldPrice: number | null;
    discount: string | null;
    isActive: boolean;
    order: number;
};

interface Category {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
}

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editBanner, setEditBanner] = useState<Banner | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'MAIN' | 'SIDE'>('ALL');
    const [linkType, setLinkType] = useState<'category' | 'custom'>('custom');

    // Form State
    const [formData, setFormData] = useState({
        type: 'MAIN' as 'MAIN' | 'SIDE',
        title: '',
        description: '',
        imageUrl: '',
        link: '',
        price: '',
        oldPrice: '',
        discount: '',
        isActive: true,
        order: '0'
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchBanners = useCallback(async () => {
        setLoading(true);
        try {
            const [bannersRes, categoriesRes] = await Promise.all([
                fetch('/api/banners'),
                fetch('/api/admin/categories')
            ]);

            if (bannersRes.ok) setBanners(await bannersRes.json());
            if (categoriesRes.ok) setCategories(await categoriesRes.json());
        } catch (error) {
            toast.error("Ma'lumotlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBanners();
    }, [fetchBanners]);

    const handleEdit = (banner: Banner) => {
        setEditBanner(banner);
        const isCategoryLink = banner.link.startsWith('/category/');
        setLinkType(isCategoryLink ? 'category' : 'custom');

        setFormData({
            type: banner.type,
            title: banner.title || '',
            description: banner.description || '',
            imageUrl: banner.imageUrl || '',
            link: banner.link || '',
            price: banner.price ? String(banner.price) : '',
            oldPrice: banner.oldPrice ? String(banner.oldPrice) : '',
            discount: banner.discount || '',
            isActive: banner.isActive,
            order: String(banner.order || 0)
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreate = () => {
        setEditBanner(null);
        setLinkType('custom');
        setFormData({
            type: 'MAIN', title: '', description: '',
            imageUrl: '', link: '', price: '',
            oldPrice: '', discount: '', isActive: true,
            order: '0'
        });
        setShowForm(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: data
            });

            if (!res.ok) throw new Error('Upload failed');
            const result = await res.json();

            setFormData(prev => ({ ...prev, imageUrl: result.url }));
            toast.success("Rasm yuklandi");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Rasm yuklashda xatolik");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const method = editBanner ? 'PUT' : 'POST';
            const url = editBanner ? `/api/banners/${editBanner.id}` : '/api/banners';

            const payload = {
                ...formData,
                price: formData.price ? parseFloat(formData.price) : null,
                oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
                order: parseInt(formData.order) || 0
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                toast.success(editBanner ? "Banner yangilandi!" : "Yangi banner qo'shildi!");
                setShowForm(false);
                fetchBanners();
            } else {
                toast.error("Saqlashda xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Xatolik");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
        try {
            const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Banner o'chirildi");
                fetchBanners();
            } else {
                toast.error("O'chirishda xatolik");
            }
        } catch (error) {
            toast.error("Xatolik");
        }
    };

    const filteredBanners = banners.filter(b => {
        const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'ALL' || b.type === typeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Bannerlar Boshqaruvi</h1>
                    <p className="text-gray-500 mt-1">Do'koningizdagi reklama va slider bannerlarini boshqaring</p>
                </motion.div>
                <Button
                    onClick={() => { setShowForm(!showForm); if (!showForm) handleCreate(); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 px-6 h-12"
                >
                    {showForm ? <X size={20} /> : <Plus size={20} />}
                    {showForm ? "Yopish" : "Yangi Banner"}
                </Button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-2xl shadow-gray-200/50"
                    >
                        <h2 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                {editBanner ? <Edit2 size={20} /> : <Plus size={20} />}
                            </div>
                            {editBanner ? 'Bannerni tahrirlash' : 'Yangi banner qo\'shish'}
                        </h2>

                        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 p-1 bg-gray-100 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'MAIN' })}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'MAIN' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <Monitor size={16} /> Asosiy Slider
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'SIDE' })}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'SIDE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <Smartphone size={16} /> Yon Banner
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Banner Sarlovhasi</label>
                                        <input
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            required
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                            placeholder="Masalan: Yangi yil chegirmalari!"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Tavsif (Ixtiyoriy)</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium resize-none"
                                            placeholder="Bannerdagi qo'shimcha matn..."
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Yo'naltirish (Link)</label>
                                            <div className="flex p-0.5 bg-gray-100 rounded-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => setLinkType('category')}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${linkType === 'category' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                                                >
                                                    Kategoriya
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setLinkType('custom')}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${linkType === 'custom' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                                                >
                                                    Custom
                                                </button>
                                            </div>
                                        </div>

                                        {linkType === 'category' ? (
                                            <select
                                                value={categories.find(c => `/category/${c.slug}` === formData.link)?.id || ''}
                                                onChange={e => {
                                                    const cat = categories.find(c => c.id === e.target.value);
                                                    if (cat) setFormData({ ...formData, link: `/category/${cat.slug}` });
                                                }}
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                                            >
                                                <option value="">Kategoriyani tanlang...</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="relative">
                                                <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    value={formData.link}
                                                    onChange={e => setFormData({ ...formData, link: e.target.value })}
                                                    className="w-full pl-11 pr-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                                    placeholder="/category/smartphones yoki https://..."
                                                />
                                            </div>
                                        )}

                                        {formData.link && (
                                            <div className="mt-1 flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                <span className="text-[10px] font-bold text-blue-600 truncate">Result: {formData.link}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Banner Rasmi</label>
                                    <div className="relative aspect-[21/9] rounded-[32px] bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group">
                                        {formData.imageUrl ? (
                                            <>
                                                <img src={formData.imageUrl} alt="" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, imageUrl: '' }))}
                                                        className="p-3 bg-red-500 text-white rounded-full shadow-xl hover:bg-red-600 transition-colors"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100/50 transition-colors">
                                                <div className="w-16 h-16 rounded-3xl bg-white shadow-xl shadow-gray-200/50 flex items-center justify-center text-blue-600 mb-4 transition-transform group-hover:scale-110">
                                                    {uploading ? <Loader2 className="animate-spin" size={32} /> : <UploadCloud size={32} />}
                                                </div>
                                                <span className="text-sm font-black text-gray-900 uppercase tracking-widest">
                                                    {uploading ? 'Yuklanmoqda...' : 'Rasm yuklash'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                                                    {formData.type === 'MAIN' ? '850x380 px tavsiya etiladi' : '500x500 px tavsiya etiladi'}
                                                </span>
                                                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Narx</label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
                                            placeholder="549000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1 text-gray-400">Eski Narx</label>
                                        <input
                                            type="number"
                                            value={formData.oldPrice}
                                            onChange={e => setFormData({ ...formData, oldPrice: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm text-gray-400"
                                            placeholder="819000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1 text-red-500">Discount</label>
                                        <input
                                            value={formData.discount}
                                            onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-sm text-red-600"
                                            placeholder="-34%"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Tartib raqami (#)</label>
                                        <input
                                            type="number"
                                            value={formData.order}
                                            onChange={e => setFormData({ ...formData, order: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm text-blue-600"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            {formData.isActive ? <Eye className="text-green-500" size={20} /> : <EyeOff className="text-gray-400" size={20} />}
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Status</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formData.isActive ? 'Saytda ko\'rinadi' : 'Yashirilgan'}</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 transition-all"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 flex gap-4 pt-6 border-t border-gray-50">
                                <Button
                                    type="submit"
                                    disabled={saving || uploading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 h-14 rounded-2xl shadow-xl shadow-blue-200 font-bold active:scale-95 transition-all min-w-[160px]"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : (editBanner ? <Edit2 size={20} /> : <Plus size={20} />)}
                                    {editBanner ? "Saqlash" : "Banner yaratish"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowForm(false); setEditBanner(null); }}
                                    className="h-14 px-10 rounded-2xl font-bold border-gray-200 text-gray-500 hover:bg-gray-50"
                                >
                                    Bekor qilish
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Bannerlarni qidirish..."
                                className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                            />
                        </div>
                        <div className="flex items-center p-1 bg-white border border-gray-200 rounded-2xl shadow-sm">
                            {(['ALL', 'MAIN', 'SIDE'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {type === 'ALL' ? 'Hammasi' : type === 'MAIN' ? 'Slider' : 'Yon'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center p-1 bg-gray-100 rounded-2xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'grid' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                                }`}
                        >
                            <LayoutGrid size={16} /> Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                                }`}
                        >
                            <ListIcon size={16} /> List
                        </button>
                    </div>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-4">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-blue-50 animate-spin border-t-blue-500" />
                                <div className="absolute inset-0 flex items-center justify-center text-blue-500">
                                    <ImageIcon size={32} />
                                </div>
                            </div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Yuklanmoqda...</p>
                        </div>
                    ) : filteredBanners.length > 0 ? (
                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" : "space-y-4"}>
                            {filteredBanners.map((banner, index) => (
                                <motion.div
                                    key={banner.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`group bg-white rounded-[32px] border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/50 transition-all ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : 'flex flex-col'
                                        }`}
                                >
                                    <div className={`relative overflow-hidden bg-gray-50 ${viewMode === 'list' ? 'w-48 h-24 rounded-2xl shrink-0' : 'aspect-[16/9]'
                                        }`}>
                                        {banner.imageUrl ? (
                                            <img
                                                src={banner.imageUrl}
                                                alt={banner.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <ImageIcon size={40} />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md ${banner.type === 'MAIN' ? 'bg-blue-600/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
                                                {banner.type === 'MAIN' ? 'Slider' : 'Side'}
                                            </span>
                                            <span className="px-2 py-1.5 rounded-lg bg-white/20 text-[10px] font-black text-white backdrop-blur-md border border-white/20">
                                                #{banner.order}
                                            </span>
                                        </div>

                                    </div>

                                    <div className="p-6 flex-1 space-y-4">
                                        <div className="space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1 flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors line-clamp-1">{banner.title}</h3>
                                                        {banner.isActive ? <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                                                    </div>
                                                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{banner.description}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => handleEdit(banner)}
                                                        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                                                        title="Tahrirlash"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(banner.id)}
                                                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                                                        title="O'chirish"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                                    <ExternalLink size={14} />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-[180px] truncate">{banner.link}</span>
                                            </div>
                                            <div
                                                onClick={() => banner.link && window.open(banner.link, '_blank')}
                                                className="flex items-center gap-2 group-hover:translate-x-1 transition-transform cursor-pointer"
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">View</span>
                                                <ArrowRight size={14} className="text-blue-600" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-40">
                            <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200 mb-6">
                                <ImageIcon size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Bannerlar topilmadi</h3>
                            <p className="text-gray-400 text-sm mt-2 font-medium">Qidiruv natijasi yoki filtr bo'yicha ma'lumot yo'q</p>
                            <Button
                                variant="outline"
                                onClick={() => { setSearchQuery(''); setTypeFilter('ALL'); }}
                                className="mt-8 rounded-2xl font-bold border-gray-200 text-gray-500 px-8"
                            >
                                Filtrlarni tozalash
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
