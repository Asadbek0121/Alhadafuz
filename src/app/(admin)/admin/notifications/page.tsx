"use client";

import { useState, useEffect } from 'react';
import { Bell, Send, Users, User, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type Notification = {
    id: string;
    title: string;
    message: string;
    userId: string | null;
    createdAt: string;
    user?: {
        name: string;
        email: string;
    };
};

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'broadcast' | 'personal'>('broadcast');
    const [targetUserId, setTargetUserId] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/admin/notifications?all=true');
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotifications(data);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);

        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    message,
                    type,
                    userId: targetUserId
                })
            });

            if (res.ok) {
                toast.success("Bildirishnoma yuborildi!");
                setTitle('');
                setMessage('');
                setTargetUserId('');
                fetchNotifications();
            } else {
                const data = await res.json();
                toast.error(data.error || "Xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Server xatosi");
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Ushbu bildirishnomani ochirib tashlamoqchimisiz?")) return;

        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'delete' })
            });

            if (res.ok) {
                toast.success("O'chirildi");
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {
            toast.error("Xatolik");
        }
    };

    return (
        <div style={{ padding: '0px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#2A3547', margin: 0 }}>Bildirishnomalar</h1>
                    <p style={{ margin: '5px 0 0', color: '#5A6A85' }}>Foydalanuvchilarga tizimli xabarlar va aktsiyalarni yuborish</p>
                </div>
                <div style={{ width: '48px', height: '48px', background: '#e6f4ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0085db' }}>
                    <Bell size={22} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }}>
                {/* Send Notification Form */}
                <div style={{ gridColumn: 'span 4' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0', position: 'sticky', top: '100px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecf2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={16} color="#0085db" />
                            </div>
                            Yangi xabar yuborish
                        </h3>

                        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#5A6A85', marginBottom: '10px' }}>Yuborish usuli</label>
                                <div style={{ display: 'flex', gap: '8px', background: '#f7f9fc', padding: '4px', borderRadius: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setType('broadcast')}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: type === 'broadcast' ? '#fff' : 'transparent',
                                            color: type === 'broadcast' ? '#0085db' : '#5A6A85',
                                            boxShadow: type === 'broadcast' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Users size={16} /> Barchaga
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('personal')}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: type === 'personal' ? '#fff' : 'transparent',
                                            color: type === 'personal' ? '#0085db' : '#5A6A85',
                                            boxShadow: type === 'personal' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <User size={16} /> Shaxsiy
                                    </button>
                                </div>
                            </div>

                            {type === 'personal' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#5A6A85', marginBottom: '8px' }}>Foydalanuvchi ID</label>
                                    <input
                                        required
                                        value={targetUserId}
                                        onChange={e => setTargetUserId(e.target.value)}
                                        placeholder="User ID (cuid) kiriting..."
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5eaef', outline: 'none', fontSize: '14px', background: '#fff' }}
                                    />
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#5A6A85', marginBottom: '8px' }}>Sarlavha</label>
                                <input
                                    required
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Masalan: %50 Chegirma kutilmoqda!"
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5eaef', outline: 'none', fontSize: '14px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#5A6A85', marginBottom: '8px' }}>Tabrik yoki Xabar matni</label>
                                <textarea
                                    required
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Xabarning to'liq matnini yozing..."
                                    rows={5}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5eaef', outline: 'none', resize: 'none', fontSize: '14px', lineHeight: '1.6' }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={sending}
                                style={{
                                    padding: '14px',
                                    borderRadius: '10px',
                                    background: '#0085db',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: '700',
                                    cursor: sending ? 'not-allowed' : 'pointer',
                                    opacity: sending ? 0.7 : 1,
                                    boxShadow: '0 4px 12px rgba(0,133,219,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {sending ? <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }}></div> : <Send size={18} />}
                                {sending ? 'Yuborilmoqda...' : 'Bildirishnomani yuborish'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* History List */}
                <div style={{ gridColumn: 'span 8' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547' }}>Yuborilgan xabarlar tarixi</h3>
                            <div style={{ fontSize: '12px', color: '#5A6A85', background: '#f0f3f6', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                                {notifications.length} ta xabar
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#999', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                    <div className="animate-spin" style={{ width: '30px', height: '30px', border: '3px solid #0085db', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                                    <span>Ma'lumotlar yuklanmoqda...</span>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div style={{ padding: '60px 40px', textAlign: 'center', color: '#999', background: '#fbfcfd', borderRadius: '12px', border: '1px dashed #e0e6ed', flexDirection: 'column', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <Bell size={48} style={{ opacity: 0.1 }} />
                                    <span style={{ fontSize: '15px', fontWeight: '500' }}>Hozircha yuborilgan bildirishnomalar mavjud emas</span>
                                    <p style={{ fontSize: '13px', margin: 0, opacity: 0.7 }}>Yangi xabar yuborish uchun chapdagi formadan foydalaning</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div key={notif.id} style={{ padding: '24px', borderRadius: '14px', border: '1px solid #edf2f7', display: 'flex', gap: '20px', alignItems: 'flex-start', background: '#fff', transition: 'all 0.2s' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '12px',
                                            background: notif.userId ? '#fff5f2' : '#ebfbf6',
                                            color: notif.userId ? '#fa896b' : '#00ceb6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            border: `1px solid ${notif.userId ? '#ffe5de' : '#d2f4ea'}`
                                        }}>
                                            {notif.userId ? <User size={22} /> : <Users size={22} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <h5 style={{ margin: 0, fontSize: '16px', color: '#2A3547', fontWeight: '700' }}>{notif.title}</h5>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span suppressHydrationWarning style={{ fontSize: '12px', color: '#999', fontWeight: '500' }}>
                                                        {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDelete(notif.id)}
                                                        style={{ background: 'none', border: 'none', color: '#fa896b', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'background 0.2s' }}
                                                        onMouseOver={e => e.currentTarget.style.background = '#fff5f2'}
                                                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#5A6A85', lineHeight: '1.6' }}>{notif.message}</p>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: notif.userId ? '#fff5f2' : '#ebfbf6',
                                                    padding: '4px 12px',
                                                    borderRadius: '6px',
                                                    color: notif.userId ? '#fa896b' : '#00ceb6',
                                                    fontWeight: '700',
                                                    fontSize: '11px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    {notif.userId ? 'Shaxsiy' : 'Barcha foydalanuvchilar'}
                                                </span>
                                                {notif.userId && (
                                                    <span style={{
                                                        background: '#f4f7fb', padding: '4px 12px', borderRadius: '6px', color: '#2A3547', fontWeight: '600', fontSize: '11px'
                                                    }}>
                                                        Kimga: {notif.user?.name || notif.user?.email || 'Noma\'lum'}
                                                    </span>
                                                )}
                                                {notif.userId && (
                                                    <span style={{
                                                        background: '#f4f7fb', padding: '4px 12px', borderRadius: '6px', color: '#5A6A85', fontWeight: '500', fontSize: '11px', fontFamily: 'monospace'
                                                    }}>
                                                        ID: {notif.userId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
