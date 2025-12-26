
"use client";

import { useState, useEffect } from 'react';
import { Bot, Save, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function TelegramSettings() {
    const [token, setToken] = useState('');
    const [adminIds, setAdminIds] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                if (data.telegramBotToken) setToken(data.telegramBotToken);
                if (data.telegramAdminIds) setAdminIds(data.telegramAdminIds);
            })
            .catch(err => console.error(err));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramBotToken: token,
                    telegramAdminIds: adminIds
                })
            });

            if (res.ok) {
                toast.success("Telegram sozlamalari saqlandi!");
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 3000);
            } else {
                toast.error("Saqlashda xatolik");
            }
        } catch (error) {
            toast.error("Server xatosi");
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        if (!adminIds) {
            toast.error("Avval Admin ID ni kiritib saqlang");
            return;
        }
        const toastId = toast.loading("Test xabar yuborilmoqda...");
        try {
            const res = await fetch('/api/admin/telegram-test', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                toast.success("Xabar yuborildi! Telegramni tekshiring.", { id: toastId });
            } else {
                toast.error(data.error || "Xatolik", { id: toastId });
            }
        } catch (e) {
            toast.error("Xatolik yuz berdi", { id: toastId });
        }
    };

    return (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 0 20px rgba(0,0,0,0.03)', marginTop: '30px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bot size={20} color="#0085db" />
                Telegram Bot Ulash
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#5A6A85', marginBottom: '8px' }}>Bot Token</label>
                    <input
                        type="password"
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none', fontFamily: 'monospace' }}
                    />
                    <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                        @BotFather orqali olingan token
                    </p>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#5A6A85', marginBottom: '8px' }}>Admin ID Lar (vergul bilan)</label>
                    <input
                        value={adminIds}
                        onChange={e => setAdminIds(e.target.value)}
                        placeholder="12345678, 87654321"
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none', fontFamily: 'monospace' }}
                    />
                    <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                        Bildirishnoma olishi kerak bo'lgan user ID lari (Chat ID). Telegramda @userinfobot orqali oling.
                    </p>
                </div>

                <div style={{ background: '#e6f4ff', padding: '15px', borderRadius: '8px', fontSize: '13px', color: '#0085db', display: 'flex', gap: '10px' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <strong>Botni ishga tushirish:</strong> Botdan xabar olish uchun avval unga kirib <b>/start</b> tugmasini bosishingiz shart.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '14px',
                            borderRadius: '8px',
                            background: isSaved ? '#13deb9' : '#0085db',
                            color: '#fff',
                            border: 'none',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'background 0.3s'
                        }}
                    >
                        {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
                        {isSaved ? 'Saqlandi' : 'Saqlash'}
                    </button>

                    <button
                        type="button"
                        onClick={handleTest}
                        style={{
                            padding: '14px 20px',
                            borderRadius: '8px',
                            background: '#e6f4ff',
                            color: '#0085db',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        <Send size={18} />
                        Test Xabar
                    </button>
                </div>
            </form>
        </div>
    );
}
