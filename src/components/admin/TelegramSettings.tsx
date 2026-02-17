"use client";

import { useState, useEffect } from 'react';
import { Bot, Save, AlertCircle, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function TelegramSettings() {
    const [token, setToken] = useState('');
    const [adminIds, setAdminIds] = useState('');
    const [fee, setFee] = useState('12000');
    const [loading, setLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                if (data.telegramBotToken) setToken(data.telegramBotToken);
                if (data.telegramAdminIds) setAdminIds(data.telegramAdminIds);
                if (data.courierFeePerOrder) setFee(data.courierFeePerOrder.toString());
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
                    telegramAdminIds: adminIds,
                    courierFeePerOrder: Number(fee)
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
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden relative group transition-all hover:shadow-2xl hover:shadow-gray-300/30">
            {/* Header with decorative background */}
            <div className="p-6 pb-0 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-12 -mt-12 blur-3xl" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Bot size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Telegram Bot</h3>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Integratsiya sozlamalari</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="p-6 pt-8 space-y-5 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Bot Token */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bot Token</label>
                            <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[10px] font-black text-indigo-500 hover:text-indigo-600">@BotFather</a>
                        </div>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            placeholder="6821...ABC"
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white px-4 py-3 rounded-2xl outline-none transition-all font-mono text-sm text-gray-900 placeholder:text-gray-300 shadow-inner"
                        />
                    </div>

                    {/* Admin IDs */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin IDlar</label>
                            <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-[10px] font-black text-indigo-500 hover:text-indigo-600">@userinfobot</a>
                        </div>
                        <input
                            value={adminIds}
                            onChange={e => setAdminIds(e.target.value)}
                            placeholder="1234, 5678"
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white px-4 py-3 rounded-2xl outline-none transition-all font-mono text-sm text-gray-900 placeholder:text-gray-300 shadow-inner"
                        />
                    </div>
                </div>

                {/* Delivery Fee */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Har bir yetkazib berish haqi</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={fee}
                            onChange={e => setFee(e.target.value)}
                            placeholder="12000"
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white px-4 py-3.5 rounded-2xl outline-none transition-all font-black text-gray-900 shadow-inner"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">SO'M</span>
                    </div>
                </div>

                {/* Notice Card */}
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 flex gap-3 text-amber-700">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold leading-relaxed">
                        Botdan xabar olish uchun barcha adminlar botga kirib <span className="text-indigo-600 font-black">/start</span> tugmasini bosishlari shart.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-200/50' : 'bg-indigo-600 text-white shadow-indigo-200/50 hover:bg-indigo-700 hover:-translate-y-0.5'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />)}
                        {isSaved ? 'SAQLANDI' : 'SAQLASH'}
                    </button>

                    <button
                        type="button"
                        onClick={handleTest}
                        className="h-12 px-5 rounded-xl border-2 border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Send size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Test</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
