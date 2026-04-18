// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function BotDebugPage() {
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fixing, setFixing] = useState(false);
    const [message, setMessage] = useState('');

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/debug/bot-health');
            const data = await res.json();
            setHealth(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
    }, []);

    const fixWebhook = async () => {
        setFixing(true);
        setMessage('');
        try {
            const res = await fetch('/api/debug/bot-fix-webhook', { method: 'POST' });
            const data = await res.json();
            setMessage(data.message || (data.ok ? "Webhook muvaffaqiyatli yangilandi!" : "Xatolik yuz berdi"));
            fetchHealth();
        } catch (e) {
            setMessage("Tarmoq xatoligi");
        } finally {
            setFixing(false);
        }
    };

    if (loading && !health) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">Bot tizimi tekshirilmoqda...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Bot Diagnostikasi</h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Hadaf Logistics Bot Management</p>
                </div>
                <Button onClick={fetchHealth} variant="outline" className="rounded-2xl h-12 gap-2 border-slate-200">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Yangilash
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 bg-white space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="text-blue-600" size={24} />
                        <h3 className="font-black text-slate-900 uppercase text-sm">Token Holati</h3>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                            <span className="text-xs font-bold text-slate-500 uppercase">COURIER_BOT_TOKEN</span>
                            <Badge variant={health?.COURIER_BOT_TOKEN?.includes('SET') ? 'default' : 'destructive'} className="rounded-lg">
                                {health?.COURIER_BOT_TOKEN || 'Noma\'lum'}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                            <span className="text-xs font-bold text-slate-500 uppercase">TELEGRAM_BOT_TOKEN</span>
                            <Badge variant={health?.TELEGRAM_BOT_TOKEN?.includes('SET') ? 'default' : 'destructive'} className="rounded-lg">
                                {health?.TELEGRAM_BOT_TOKEN || 'Noma\'lum'}
                            </Badge>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 bg-white space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap className="text-emerald-500" size={24} />
                        <h3 className="font-black text-slate-900 uppercase text-sm">Webhook Holati</h3>
                    </div>

                    <div className="space-y-2 pt-2 text-[11px] font-medium text-slate-600 break-all bg-slate-50 p-4 rounded-2xl">
                        <p className="font-black uppercase text-slate-400 mb-1">Target URL:</p>
                        {health?.webhookUrl}
                    </div>

                    <Button
                        onClick={fixWebhook}
                        disabled={fixing}
                        className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold uppercase text-[11px] tracking-wider transition-all active:scale-95"
                    >
                        {fixing ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                        Webhookni qatva sozlash (Reset)
                    </Button>

                    {message && (
                        <p className={`text-center text-[10px] font-black uppercase tracking-wider ${message.includes('Xatolik') ? 'text-red-500' : 'text-emerald-500'}`}>
                            {message}
                        </p>
                    )}
                </Card>
            </div>

            <Card className="p-8 rounded-[40px] border-slate-100 shadow-2xl shadow-slate-200/60 bg-white">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 uppercase">Telegram API Response</h3>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-0.5">Real-time bot status</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {health?.diagnostics?.map((diag: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 rounded-[24px] p-6 border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-black text-slate-900 uppercase text-xs tracking-wider">{diag.bot}</span>
                                {diag.status === 'OK' ? (
                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 rounded-lg py-1 px-3">ACTIVE</Badge>
                                ) : (
                                    <Badge variant="destructive" className="rounded-lg py-1 px-3">ERROR</Badge>
                                )}
                            </div>
                            <pre className="text-[10px] font-mono text-slate-500 overflow-x-auto p-4 bg-white/50 rounded-xl border border-slate-100/50">
                                {JSON.stringify(diag.detail, null, 2)}
                            </pre>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
