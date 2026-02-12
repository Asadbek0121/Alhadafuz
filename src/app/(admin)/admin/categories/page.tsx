
"use client";

import React, { useState, useEffect, Fragment, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Loader2, Plus, Trash2, Edit2, UploadCloud,
    CornerDownRight, ChevronDown, ChevronRight,
    Folder, FolderPlus, Search, X, Image as ImageIcon,
    LayoutGrid, List, MoreVertical, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface Category {
    id: string;
    name: string;
    parentId: string | null;
    image: string | null;
    slug: string;
    _count?: { products: number };
    parent?: { name: string };
    children?: Category[];
    isActive?: boolean;
}

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

    // Form state
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [image, setImage] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [editId, setEditId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
                // Expand all by default initially
                if (expandedIds.size === 0) {
                    setExpandedIds(new Set(data.filter((c: any) => c.parentId === null).map((c: any) => c.id)));
                }
            }
        } catch (e) {
            toast.error("Kategoriyalarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    }, [expandedIds.size]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

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
            const url = editId ? `/api/admin/categories/${editId}` : '/api/admin/categories';
            const method = editId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parentId: parentId || null, image, isActive })
            });

            if (res.ok) {
                toast.success(editId ? "Kategoriya yangilandi" : "Kategoriya yaratildi");
                resetForm();
                fetchCategories();
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

    const resetForm = () => {
        setName('');
        setParentId('');
        setImage('');
        setIsActive(true);
        setEditId(null);
    };

    const handleEdit = (cat: Category) => {
        setEditId(cat.id);
        setName(cat.name);
        setParentId(cat.parentId || '');
        setImage(cat.image || '');
        setIsActive(cat.isActive !== false);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("O'chirishni tasdiqlaysizmi? Bu kategoriya ostidagi mahsulotlar o'chirilmaydi, lekin kategoriyasiz qolishi mumkin.")) return;
        try {
            const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Kategoriya o'chirildi");
                fetchCategories();
            } else {
                toast.error("Xatolik");
            }
        } catch (e) {
            toast.error("Xatolik");
        }
    };

    const buildTree = (cats: Category[], parentId: string | null = null): Category[] => {
        return cats
            .filter(c => c.parentId === parentId)
            .map(c => ({
                ...c,
                children: buildTree(cats, c.id)
            }));
    };

    const tree = buildTree(categories);

    const renderTreeItem = (category: Category, depth = 0) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedIds.has(category.id);
        const isVisible = searchQuery ?
            category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.children?.some(child => child.name.toLowerCase().includes(searchQuery.toLowerCase())) : true;

        if (searchQuery && !isVisible && !category.children?.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))) return null;

        return (
            <Fragment key={category.id}>
                <motion.div
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`group flex items-center justify-between p-3 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all border border-transparent hover:border-gray-50 mb-1 ${depth > 0 ? 'ml-8' : ''}`}
                >
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                            {hasChildren ? (
                                <button
                                    onClick={() => toggleExpand(category.id)}
                                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                                >
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                            ) : (
                                <div className="w-6 h-6" /> // spacer
                            )}

                            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shadow-inner flex items-center justify-center text-gray-400">
                                {category.image ? (
                                    <img src={category.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Folder size={20} />
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold tracking-tight text-gray-900 ${depth === 0 ? 'text-base' : 'text-sm'}`}>
                                    {category.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-tighter border border-gray-100">
                                    {category.slug.split('-').slice(0, -1).join('-') || category.slug}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${depth === 0 ? 'text-blue-500' : (depth === 1 ? 'text-purple-500' : 'text-green-500')
                                    }`}>
                                    {depth === 0 ? 'Asosiy' : (depth === 1 ? 'Sub-kategoriya' : 'Mikro-kategoriya')}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {category._count?.products || 0} mahsulot
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEdit(category)}
                        >
                            <Edit2 size={16} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(category.id)}
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {isExpanded && hasChildren && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-l border-gray-100 ml-6 pl-2"
                        >
                            {category.children?.map(child => renderTreeItem(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Fragment>
        );
    };

    return (
        <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Kataloglar Boshqaruvi</h1>
                    <p className="text-gray-500 mt-1">Mahsulot toifalari va iyerarxiyasini boshqaring</p>
                </div>
                <Button
                    onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 px-6"
                >
                    {showForm ? <X size={18} /> : <Plus size={18} />}
                    {showForm ? "Yopish" : "Yangi Kategoriya"}
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
                            {editId ? <Edit2 className="text-blue-600" size={24} /> : <FolderPlus className="text-blue-600" size={24} />}
                            {editId ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya qo\'shish'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Kategoriya Nomi</label>
                                    <input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                        placeholder="Masalan: Uy va Bog' uchun"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Ota Kategoriya (Hierarchy)</label>
                                    <select
                                        value={parentId}
                                        onChange={e => setParentId(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none"
                                        style={{ backgroundPosition: 'right 1rem center' }}
                                    >
                                        <option value="">Asosiy (Ota kategoriya yo'q)</option>
                                        {categories.filter(c => c.id !== editId).map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.parentId ? '   — ' : ''}{c.name}
                                            </option>
                                        ))}
                                    </select>
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
                                <label className="text-sm font-bold text-gray-700 ml-1">Kategoriya Rasmi</label>
                                <div className="flex flex-wrap items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                    {image ? (
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-xl ring-1 ring-gray-100">
                                                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setImage('')}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-300">
                                            <ImageIcon size={32} />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-[200px]">
                                        <h4 className="text-sm font-bold text-gray-900">Rasm yuklash</h4>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG yoki WEBP, maksimal 2MB</p>
                                        <label className="mt-4 flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all shadow-sm active:scale-95">
                                            {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} className="text-blue-600" />}
                                            {uploading ? "Yuklanmoqda..." : "Faylni tanlash"}
                                            <input type="file" hidden accept="image/*" onChange={handleUpload} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-50">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-2xl shadow-xl shadow-blue-200 font-bold"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : (editId ? <Save size={20} /> : <Plus size={20} />)}
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

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Kategoriyalarni qidirish..."
                            className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setViewMode('tree')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'tree' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                                }`}
                        >
                            <LayoutGrid size={14} /> {viewMode === 'tree' && 'Daraxtsimon'}
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                                }`}
                        >
                            <List size={14} /> {viewMode === 'list' && 'Ro\'yxat'}
                        </button>
                    </div>
                </div>

                <div className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-blue-50 animate-spin border-t-blue-500" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <LayoutGrid className="text-blue-500" size={24} />
                                </div>
                            </div>
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Yuklanmoqda...</p>
                        </div>
                    ) : (
                        <div className="min-w-[800px]">
                            {viewMode === 'list' && (
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-1">Rasm</div>
                                    <div className="col-span-3">Nomi</div>
                                    <div className="col-span-3">Slug</div>
                                    <div className="col-span-2">Ota Kategoriya</div>
                                    <div className="col-span-1 text-center">Holati</div>
                                    <div className="col-span-2 text-right">Amallar</div>
                                </div>
                            )}

                            <div className="divide-y divide-gray-50">
                                {viewMode === 'tree' ? (
                                    tree.length > 0 ? (
                                        <div className="p-6 space-y-1">
                                            {tree.map(cat => renderTreeItem(cat))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-32">
                                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-200">
                                                <ImageIcon size={40} />
                                            </div>
                                            <p className="text-xl font-black text-gray-900">Kategoriyalar topilmadi</p>
                                            <p className="text-gray-400 text-sm mt-1">Hozircha hech qanday ma'lumot mavjud emas</p>
                                        </div>
                                    )
                                ) : (
                                    categories.length > 0 ? (
                                        categories
                                            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map(category => (
                                                <div key={category.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                                                    <div className="col-span-1">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center text-gray-400">
                                                            {category.image ? (
                                                                <img src={category.image} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Folder size={18} />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <span className="font-bold text-gray-900 text-sm">{category.name}</span>
                                                        <div className="text-xs text-gray-400">{category._count?.products || 0} mahsulot</div>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <code className="px-2 py-1 rounded-md bg-gray-100 text-xs font-mono text-gray-600">{category.slug}</code>
                                                    </div>
                                                    <div className="col-span-2">
                                                        {category.parent ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                                                                <CornerDownRight size={12} />
                                                                {category.parent.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">—</span>
                                                        )}
                                                    </div>
                                                    <div className="col-span-1 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${(category as any).isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {(category as any).isActive !== false ? 'Faol' : 'Nofaol'}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50"
                                                            onClick={() => handleEdit(category)}
                                                        >
                                                            <Edit2 size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDelete(category.id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="text-center py-20 col-span-12">
                                            <p className="text-gray-500">Kategoriyalar topilmadi</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const Save = ({ size }: { size: number }) => <Plus size={size} />; // Placeholder as Save is not imported
