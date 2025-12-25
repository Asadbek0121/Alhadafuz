
"use client";

import React, { useState, useEffect, Fragment } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, UploadCloud, CornerDownRight } from 'lucide-react';
import Image from 'next/image';

interface Category {
    id: string;
    name: string;
    parentId: string | null;
    image: string | null;
    _count?: { products: number };
    parent?: { name: string };
    children?: Category[];
}

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [image, setImage] = useState('');
    const [editId, setEditId] = useState<string | null>(null);

    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (e) {
            toast.error("Kategoriyalarni yuklashda xatolik");
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
            const url = editId ? `/api/admin/categories/${editId}` : '/api/admin/categories';
            const method = editId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parentId: parentId || null, image })
            });

            if (res.ok) {
                toast.success(editId ? "Kategoriya yangilandi" : "Kategoriya yaratildi");
                setName('');
                setParentId('');
                setImage('');
                setEditId(null);
                fetchCategories();
            } else {
                toast.error("Saqlashda xatolik");
            }
        } catch (e) {
            toast.error("Xatolik");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (cat: Category) => {
        setEditId(cat.id);
        setName(cat.name);
        setParentId(cat.parentId || '');
        setImage(cat.image || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
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

    // Recursive helper to build tree
    const getHierarchy = () => {
        const buildTree = (parentId: string | null = null): Category[] => {
            return categories
                .filter(c => c.parentId === parentId)
                .map(c => ({
                    ...c,
                    children: buildTree(c.id)
                }));
        };
        return buildTree(null);
    };

    const hierarchy = getHierarchy();

    // Recursive render function
    const renderCategoryRow = (category: Category, depth = 0) => {
        const isParent = depth === 0;

        return (
            <Fragment key={category.id}>
                <tr style={{ borderBottom: '1px solid #eee', background: isParent ? '#fff' : (depth === 1 ? '#fafafa' : '#f0fdf4') }}>
                    <td style={{ padding: '12px 24px' }}>
                        <div style={{ width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '6px', overflow: 'hidden' }}>
                            {category.image ? <img src={category.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                        </div>
                    </td>
                    <td style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${depth * 24}px` }}>
                            {depth > 0 && <CornerDownRight size={16} style={{ marginRight: '8px', color: '#9ca3af' }} />}
                            <span style={{ fontWeight: isParent ? 700 : (depth === 1 ? 500 : 400), fontSize: isParent ? '15px' : '14px' }}>
                                {category.name}
                            </span>
                        </div>
                    </td>
                    <td style={{ padding: '12px 24px' }}>
                        <span style={{
                            padding: '4px 10px',
                            background: isParent ? '#e0f2fe' : (depth === 1 ? '#f3f4f6' : '#dcfce7'),
                            color: isParent ? '#0369a1' : (depth === 1 ? '#374151' : '#166534'),
                            borderRadius: '20px', fontSize: '11px', fontWeight: '600'
                        }}>
                            {depth === 0 ? 'Asosiy' : (depth === 1 ? 'Sub-kategoriya' : 'Mikro-kategoriya')}
                        </span>
                    </td>
                    <td style={{ padding: '12px 24px', fontSize: '13px' }}>{category._count?.products || 0}</td>
                    <td style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleEdit(category)} style={{ padding: '6px', color: '#0066cc', background: '#eff6ff', borderRadius: '4px', border: 'none', cursor: 'pointer' }}><Edit size={16} /></button>
                            <button onClick={() => handleDelete(category.id)} style={{ padding: '6px', color: '#ef4444', background: '#fef2f2', borderRadius: '4px', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                    </td>
                </tr>
                {category.children?.map(child => renderCategoryRow(child, depth + 1))}
            </Fragment>
        );
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Kataloglar Boshqaruvi</h1>

            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #eee' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                    {editId ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya qo\'shish'}
                </h2>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Nomi</label>
                            <input
                                value={name} onChange={e => setName(e.target.value)}
                                required className="input-field" placeholder="Masalan: Elektronika"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Ota kategoriya</label>
                            <select
                                value={parentId} onChange={e => setParentId(e.target.value)}
                                className="input-field"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff' }}
                            >
                                <option value="">Yo'q (Bu asosiy kategoriya)</option>
                                {/* Flatten hierarchy for select options to show tree structure */}
                                {categories.map(c => (
                                    <option key={c.id} value={c.id} disabled={c.id === editId}>
                                        {c.parent ? `— ${c.name}` : c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Rasm (Ixtiyoriy)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            {image && (
                                <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' }}>
                                    <img src={image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 20px', background: '#f0f9ff', color: '#0066cc',
                                borderRadius: '8px', cursor: 'pointer', fontWeight: '500'
                            }}>
                                {uploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                                {uploading ? "Yuklanmoqda..." : "Rasm Yuklash"}
                                <input type="file" hidden accept="image/*" onChange={handleUpload} />
                            </label>
                            {image && (
                                <button type="button" onClick={() => setImage('')} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>O'chirish</button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="submit" disabled={submitting}
                            style={{
                                padding: '12px 24px', background: '#0066cc', color: '#fff',
                                border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : (editId ? <Edit size={18} /> : <Plus size={18} />)}
                            {editId ? "Saqlash" : "Qo'shish"}
                        </button>
                        {editId && (
                            <button
                                type="button" onClick={() => { setEditId(null); setName(''); setParentId(''); setImage(''); }}
                                style={{ padding: '12px 24px', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Bekor qilish
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                                <th style={{ padding: '15px 24px', color: '#4b5563', fontWeight: '600', fontSize: '14px' }}>Rasm</th>
                                <th style={{ padding: '15px 24px', color: '#4b5563', fontWeight: '600', fontSize: '14px' }}>Nomi</th>
                                <th style={{ padding: '15px 24px', color: '#4b5563', fontWeight: '600', fontSize: '14px' }}>Turi</th>
                                <th style={{ padding: '15px 24px', color: '#4b5563', fontWeight: '600', fontSize: '14px' }}>Mahsulotlar</th>
                                <th style={{ padding: '15px 24px', color: '#4b5563', fontWeight: '600', fontSize: '14px' }}>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hierarchy.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Kategoriyalar mavjud emas</td>
                                </tr>
                            )}
                            {hierarchy.map(cat => renderCategoryRow(cat))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
