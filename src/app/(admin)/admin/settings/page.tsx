
"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        siteName: '',
        phone: '',
        email: '',
        address: '',
        socialLinks: { telegram: '', instagram: '', facebook: '', youtube: '' }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const data = await res.json();
                let social = { telegram: '', instagram: '', facebook: '', youtube: '', supportTelegram: '' };
                if (data.socialLinks) {
                    try { social = { ...social, ...JSON.parse(data.socialLinks) }; } catch (e) { }
                }
                setFormData({
                    siteName: data.siteName || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    socialLinks: social
                });
            }
        } catch (e) {
            toast.error("Sozlamalarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...formData,
                socialLinks: JSON.stringify(formData.socialLinks)
            };
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Sozlamalar saqlandi");
            } else {
                toast.error("Xatolik");
            }
        } catch (e) {
            toast.error("Xatolik");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Do'kon Sozlamalari</h1>

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '30px' }}>

                {/* 1. Asosiy Ma'lumotlar */}
                {/* 1. Asosiy Ma'lumotlar */}
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>Asosiy Ma'lumotlar</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Sayt Nomi</label>
                            <input
                                value={formData.siteName}
                                onChange={e => setFormData({ ...formData, siteName: e.target.value })}
                                className="input-field"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Aloqa Ma'lumotlari (Footer) */}
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0', color: '#0066cc' }}>
                        Aloqa Ma'lumotlari
                    </h3>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                        Bosh sahifaning footer qismida va "Qo'llab-quvvatlash" sahifasida ko'rinadi.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Telefon Raqam</label>
                            <input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="input-field"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                placeholder="+998 71 123 45 67"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email</label>
                            <input
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="input-field"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                placeholder="support@uzmarket.uz"
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Manzil</label>
                            <textarea
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="input-field"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                rows={2}
                                placeholder="Toshkent sh..."
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#0066cc' }}>Qo'llab-quvvatlash Telegrami (Opsional)</label>
                            <input
                                value={(formData.socialLinks as any).supportTelegram || ''}
                                onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, supportTelegram: e.target.value } } as any)}
                                className="input-field"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                placeholder="https://t.me/uzmarket_support"
                            />
                            <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Agar kiritilmasa, pastdagi asosiy Telegram havolasi ishlatiladi.</p>
                        </div>
                    </div>
                </div>

                {/* 3. Ijtimoiy Tarmoqlar */}
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>Ijtimoiy Tarmoqlar</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>Telegram</label>
                            <input
                                value={formData.socialLinks.telegram}
                                onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, telegram: e.target.value } })}
                                className="input-field"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                placeholder="https://t.me/..."
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>Instagram</label>
                            <input
                                value={formData.socialLinks.instagram}
                                onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: e.target.value } })}
                                className="input-field"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                placeholder="https://instagram.com/..."
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>Facebook</label>
                            <input
                                value={formData.socialLinks.facebook}
                                onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, facebook: e.target.value } })}
                                className="input-field"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                placeholder="https://facebook.com/..."
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>Youtube</label>
                            <input
                                value={formData.socialLinks.youtube}
                                onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, youtube: e.target.value } })}
                                className="input-field"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                placeholder="https://youtube.com/..."
                            />
                        </div>
                    </div>
                </div>

                <div style={{ paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '12px 30px', background: '#0066cc', color: '#fff',
                            border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {saving ? "Saqlanmoqda..." : "Saqlash"}
                    </button>
                </div>
            </form>
        </div>
    );
}
