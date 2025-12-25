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
            const res = await fetch('/api/admin/notifications');
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

    return (
        <div style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#2A3547', margin: 0 }}>Bildirishnomalar</h1>
                    <p style={{ margin: '5px 0 0', color: '#5A6A85' }}>Foydalanuvchilarga xabar yuborish</p>
                </div>
                <div style={{ width: '50px', height: '50px', background: '#e6f4ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0085db' }}>
                    <Bell size={24} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }}>
                {/* Send Notification Form */}
                <div style={{ gridColumn: 'span 4' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 0 20px rgba(0,0,0,0.03)', position: 'sticky', top: '100px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Send size={20} color="#0085db" />
                            Yangi bildirishnoma
                        </h3>

                        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#5A6A85', marginBottom: '8px' }}>Yuborish turi</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setType('broadcast')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: `1px solid ${type === 'broadcast' ? '#0085db' : '#e5eaef'}`,
                                            background: type === 'broadcast' ? '#e6f4ff' : '#fff',
                                            color: type === 'broadcast' ? '#0085db' : '#5A6A85',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        <Users size={16} /> Barchaga
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('personal')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: `1px solid ${type === 'personal' ? '#0085db' : '#e5eaef'}`,
                                            background: type === 'personal' ? '#e6f4ff' : '#fff',
                                            color: type === 'personal' ? '#0085db' : '#5A6A85',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        <User size={16} /> Shaxsiy
                                    </button>
                                </div>
                            </div>

                            {type === 'personal' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#5A6A85', marginBottom: '8px' }}>Foydalanuvchi ID</label>
                                    <input
                                        required
                                        value={targetUserId}
                                        onChange={e => setTargetUserId(e.target.value)}
                                        placeholder="User ID kiriting..."
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none' }}
                                    />
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#5A6A85', marginBottom: '8px' }}>Sarlavha</label>
                                <input
                                    required
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Masalan: Yangi aksiya!"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#5A6A85', marginBottom: '8px' }}>Xabar matni</label>
                                <textarea
                                    required
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Xabar mazmuni..."
                                    rows={4}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none', resize: 'none' }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={sending}
                                style={{
                                    padding: '14px',
                                    borderRadius: '8px',
                                    background: '#0085db',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: '600',
                                    cursor: sending ? 'not-allowed' : 'pointer',
                                    opacity: sending ? 0.7 : 1
                                }}
                            >
                                {sending ? 'Yuborilmoqda...' : 'Yuborish'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* History List */}
                <div style={{ gridColumn: 'span 8' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', marginBottom: '20px' }}>Yuborilgan xabarlar</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {loading ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Yuklanmoqda...</div>
                            ) : notifications.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#999', flexDirection: 'column', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Bell size={40} style={{ opacity: 0.2 }} />
                                    <span>Hozircha bildirishnomalar yo'q</span>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div key={notif.id} style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e5eaef', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: notif.userId ? '#fbf2ef' : '#e6fffa',
                                            color: notif.userId ? '#fa896b' : '#00ceb6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            {notif.userId ? <User size={20} /> : <Users size={20} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <h5 style={{ margin: 0, fontSize: '16px', color: '#2A3547', fontWeight: '700' }}>{notif.title}</h5>
                                                <span suppressHydrationWarning style={{ fontSize: '12px', color: '#999' }}>
                                                    {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#5A6A85', lineHeight: '1.5' }}>{notif.message}</p>
                                            <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                                                <span style={{
                                                    background: '#f4f7fb', padding: '4px 10px', borderRadius: '4px', color: '#5A6A85', fontWeight: '600'
                                                }}>
                                                    {notif.userId ? `Shaxsiy: ${notif.user?.name || notif.user?.email || notif.userId.slice(0, 8) + '...'}` : 'Barchaga'}
                                                </span>
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
