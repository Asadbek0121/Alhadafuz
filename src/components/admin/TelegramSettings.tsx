"use client";

import { useState, useEffect } from 'react';
import { Bot, Save, AlertCircle, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-700" />

            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-inner">
                    <Bot size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Telegram Bot</h3>
                    <p className="text-sm font-medium text-gray-400">Bildirishnomalar uchun integratsiya</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 relative z-10">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bot Token</label>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-[20px] outline-none transition-all font-mono text-sm text-gray-900 placeholder:text-gray-300"
                    />
                    <p className="text-xs text-blue-500/80 font-medium ml-1">
                        @BotFather orqali olingan token
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Admin ID (Chat ID)</label>
                    <input
                        value={adminIds}
                        onChange={e => setAdminIds(e.target.value)}
                        placeholder="12345678, 87654321"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-[20px] outline-none transition-all font-mono text-sm text-gray-900 placeholder:text-gray-300"
                    />
                    <p className="text-xs text-blue-500/80 font-medium ml-1">
                        Vergul bilan ajratilgan IDlar. @userinfobot orqali oling.
                    </p>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-2xl flex gap-3 text-blue-600">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-medium leading-relaxed">
                        <span className="font-bold block mb-1">Muhim eslatma:</span>
                        Botdan xabar olish uchun barcha adminlar botga kirib <span className="font-mono bg-blue-100 px-1 rounded">/start</span> tugmasini bosishlari shart.
                    </p>
                </div>

                <div className="flex gap-4 pt-2">
                    <Button
                        type="submit"
                        disabled={loading}
                        className={`flex-1 h-14 rounded-2xl font-black text-base uppercase tracking-tight gap-2 transition-all ${isSaved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-xl shadow-blue-200/20`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (isSaved ? <CheckCircle2 size={20} /> : <Save size={20} />)}
                        {isSaved ? 'SAQLANDI' : 'SAQLASH'}
                    </Button>

                    <Button
                        type="button"
                        onClick={handleTest}
                        variant="outline"
                        className="h-14 px-6 rounded-2xl border-2 border-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-200 font-black gap-2"
                    >
                        <Send size={18} />
                        <span className="hidden sm:inline">TEST XABAR</span>
                    </Button>
                </div>
            </form>
        </div>
    );
}
