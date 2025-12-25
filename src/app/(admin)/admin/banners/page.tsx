
"use client";

import { useState, useEffect } from 'react';
import { Plus, X, UploadCloud, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

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
};

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [editBanner, setEditBanner] = useState<Banner | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        type: 'MAIN',
        title: '',
        description: '',
        imageUrl: '',
        link: '',
        price: '',
        oldPrice: '',
        discount: ''
    });
    const [uploading, setUploading] = useState(false);

    const fetchBanners = () => {
        setLoading(true);
        fetch('/api/banners')
            .then(res => res.json())
            .then(data => {
                setBanners(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleEdit = (banner: Banner) => {
        setEditBanner(banner);
        setFormData({
            type: banner.type,
            title: banner.title || '',
            description: banner.description || '',
            imageUrl: banner.imageUrl || '',
            link: banner.link || '',
            price: banner.price ? String(banner.price) : '',
            oldPrice: banner.oldPrice ? String(banner.oldPrice) : '',
            discount: banner.discount || ''
        });
        setOpenModal(true);
    };

    const handleCreate = () => {
        setEditBanner(null);
        setFormData({ type: 'MAIN', title: '', description: '', imageUrl: '', link: '', price: '', oldPrice: '', discount: '' });
        setOpenModal(true);
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
        try {
            const method = editBanner ? 'PUT' : 'POST';
            const url = editBanner ? `/api/banners/${editBanner.id}` : '/api/banners';

            const payload = {
                ...formData,
                price: formData.price ? parseFloat(formData.price) : null,
                oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                toast.success("Banner saqlandi!");
                setOpenModal(false);
                fetchBanners();
            } else {
                toast.error("Banner saqlashda xatolik");
            }
        } catch (error) {
            toast.error("Xatolik");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
        await fetch(`/api/banners/${id}`, { method: 'DELETE' });
        fetchBanners();
        toast.success("O'chirildi");
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Bannerlar Boshqaruvi</h1>
                <button
                    onClick={handleCreate}
                    style={{ background: '#0085db', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                    <Plus size={18} /> Banner qo'shish
                </button>
            </div>

            {/* List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {banners.map(banner => (
                    <div key={banner.id} style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px', zIndex: 10 }}>
                            <button onClick={() => handleEdit(banner)} style={{ background: '#ecf2ff', color: '#0085db', border: 'none', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(banner.id)} style={{ background: '#fdede8', color: '#fa896b', border: 'none', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={14} />
                            </button>
                        </div>
                        <div style={{ height: '150px', background: '#f4f7fb', borderRadius: '8px', marginBottom: '15px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {banner.imageUrl ? (
                                <img src={banner.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ color: '#999' }}>Rasm yo'q</span>
                            )}
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: banner.type === 'MAIN' ? '#ecf2ff' : '#e6fffa', color: banner.type === 'MAIN' ? '#0085db' : '#00ceb6' }}>
                            {banner.type}
                        </span>
                        <h3 style={{ margin: '10px 0 5px', fontSize: '16px', fontWeight: '600' }}>{banner.title || 'Nomsiz'}</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{banner.link}</p>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {openModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', width: '500px', maxWidth: '90%' }}>
                        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>{editBanner ? 'Bannerni Tahrirlash' : 'Yangi Banner'}</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Turi</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    <option value="MAIN">Asosiy Slider (Main)</option>
                                    <option value="SIDE">Yon Banner (Side)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Sarlovha</label>
                                <input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Masalan: Kuzgi Chegirmalar"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Tavsif (Description)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Bannerdagi qo'shimcha matn..."
                                    rows={3}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Rasm</label>
                                <div style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center', position: 'relative' }}>
                                    {formData.imageUrl ? (
                                        <div style={{ position: 'relative', height: '100px', overflow: 'hidden', borderRadius: '6px' }}>
                                            <img src={formData.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, imageUrl: '' }))}
                                                style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ) : (
                                        <div onClick={() => document.getElementById('banner-upload')?.click()} style={{ cursor: 'pointer' }}>
                                            <div style={{ color: '#0085db', marginBottom: '5px' }}><UploadCloud size={24} /></div>
                                            <span style={{ fontSize: '12px', color: '#666' }}>
                                                {uploading ? 'Yuklanmoqda...' : 'Rasm yuklash uchun bosing'}
                                            </span>
                                            <div style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                                                {formData.type === 'MAIN' ? 'Tavsiya: 850x380 px (JPG/PNG)' : 'Tavsiya: 500x500 px (Transparent PNG)'}
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        id="banner-upload"
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={handleImageUpload}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Link (Havola)</label>
                                <input
                                    value={formData.link}
                                    onChange={e => setFormData({ ...formData, link: e.target.value })}
                                    placeholder="/product/123 yoki https://..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Narx (so'm)</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="549000"
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Eski Narx</label>
                                    <input
                                        type="number"
                                        value={formData.oldPrice}
                                        onChange={e => setFormData({ ...formData, oldPrice: e.target.value })}
                                        placeholder="819000"
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Chegirma</label>
                                    <input
                                        value={formData.discount}
                                        onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                        placeholder="-34%"
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setOpenModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>Bekor qilish</button>
                                <button type="submit" disabled={uploading} style={{ flex: 1, padding: '12px', border: 'none', background: '#0085db', color: '#fff', borderRadius: '6px', cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}>Saqlash</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
