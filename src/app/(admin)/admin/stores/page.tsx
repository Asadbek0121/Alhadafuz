"use client";

import { useState, useEffect } from 'react';
import { Plus, Edit2, X, MapPin, Clock, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { deleteStore } from '@/app/actions/store';

type Store = {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    workingHours: string | null;
};

export default function AdminStoresPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [editStore, setEditStore] = useState<Store | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        workingHours: ''
    });

    const fetchStores = () => {
        setLoading(true);
        fetch('/api/stores', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setStores(data);
                setLoading(false);
            })
            .catch((e) => {
                console.error("Fetch stores error:", e);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStores();
    }, []);

    const handleCreate = () => {
        setEditStore(null);
        setFormData({ name: '', address: '', phone: '+998 ', workingHours: '09:00 - 18:00' });
        setOpenModal(true);
    };

    const handleEdit = (store: Store) => {
        setEditStore(store);
        setFormData({
            name: store.name,
            address: store.address,
            phone: store.phone || '',
            workingHours: store.workingHours || ''
        });
        setOpenModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!id) return;
        if (!window.confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;

        const promise = deleteStore(id).then((res) => {
            if (!res.success) throw new Error(res.error);
            fetchStores(); // Refresh list
        });

        toast.promise(promise, {
            loading: 'O\'chirilmoqda...',
            success: 'O\'chirildi',
            error: (err) => `Xatolik: ${err.message}`
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editStore ? `/api/stores/${editStore.id}` : '/api/stores';
            const method = editStore ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Saqlandi");
                setOpenModal(false);
                fetchStores();
            } else {
                const errData = await res.json();
                toast.error(errData.error || "Saqlashda xatolik");
                console.error("Save error:", errData);
            }
        } catch (e) {
            console.error("Fetch error:", e);
            toast.error("Xatolik yuz berdi");
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Do'konlar</h1>
                <button
                    onClick={handleCreate}
                    style={{ background: '#0085db', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                    <Plus size={18} /> Qo'shish
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {stores.map(store => (
                    <div key={store.id} style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => handleEdit(store)} style={{ background: '#ecf2ff', color: '#0085db', border: 'none', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Edit2 size={14} />
                            </button>
                            <button type="button" onClick={() => handleDelete(store.id)} style={{ background: '#fdede8', color: '#fa896b', border: 'none', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={14} />
                            </button>
                        </div>

                        <h3 style={{ margin: '0 0 15px', fontSize: '18px', fontWeight: '600' }}>{store.name}</h3>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', color: '#555', fontSize: '14px' }}>
                            <MapPin size={18} style={{ flexShrink: 0 }} />
                            <span>{store.address}</span>
                        </div>
                        {store.phone && (
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', color: '#555', fontSize: '14px' }}>
                                <Phone size={18} style={{ flexShrink: 0 }} />
                                <span>{store.phone}</span>
                            </div>
                        )}
                        {store.workingHours && (
                            <div style={{ display: 'flex', gap: '10px', color: '#555', fontSize: '14px' }}>
                                <Clock size={18} style={{ flexShrink: 0 }} />
                                <span>{store.workingHours}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {openModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', width: '450px', maxWidth: '90%' }}>
                        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>{editStore ? "Do'konni tahrirlash" : "Yangi Do'kon"}</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Nomi</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Masalan: HADAF - Chilonzor"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Manzil</label>
                                <input
                                    required
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Ko'cha va uy raqami"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Telefon</label>
                                <input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+998 90 123 45 67"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Ish vaqti</label>
                                <input
                                    value={formData.workingHours}
                                    onChange={e => setFormData({ ...formData, workingHours: e.target.value })}
                                    placeholder="09:00 - 20:00"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setOpenModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>Bekor qilish</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', background: '#0085db', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Saqlash</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
