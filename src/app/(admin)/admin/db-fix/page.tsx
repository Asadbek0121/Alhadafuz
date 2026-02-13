
"use client";

import { useState } from 'react';
import { Database, ShieldAlert, CheckCircle2, Loader2, Play } from 'lucide-react';

export default function DBFixPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

    const runFix = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/admin/db-fix', { method: 'POST' });
            const data = await res.json();
            setResult({
                success: res.ok,
                message: data.message || (res.ok ? "Baza muvaffaqiyatli yangilandi!" : "Xatolik yuz berdi"),
                details: data.details
            });
        } catch (error) {
            setResult({ success: false, message: "Server bilan aloqa uzildi" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-[32px] p-10 shadow-2xl shadow-indigo-500/5 border border-indigo-50">
                <div className="flex items-center gap-6 mb-8 text-indigo-600">
                    <div className="p-4 bg-indigo-50 rounded-2xl">
                        <Database size={40} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900">Ma'lumotlar Bazasi Diagnostikasi</h1>
                        <p className="text-gray-500 font-medium tracking-tight">Eskirgan jadvallarni va yetishmayotgan ustunlarni tuzatish</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
                        <ShieldAlert className="text-amber-500 shrink-0" size={24} />
                        <div>
                            <h3 className="font-bold text-amber-900 mb-1">Diqqat!</h3>
                            <p className="text-amber-800 text-sm leading-relaxed opacity-80">
                                Ushbu amal ma'lumotlar bazasi sxemasini majburiy ravishda yangilaydi.
                                Xususan, <code className="bg-amber-100/50 px-1 rounded">vendorId</code> ustunlari jadvallarga qo'shiladi.
                                Bu xavfsiz amal hisoblanadi (ma'lumotlar o'chirilmaydi).
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={runFix}
                        disabled={loading}
                        className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 overflow-hidden relative group"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Yangilanmoqda...
                            </>
                        ) : (
                            <>
                                <Play size={20} fill="currentColor" />
                                Sxemani yangilashni boshlash
                            </>
                        )}
                    </button>

                    {result && (
                        <div className={`rounded-2xl p-6 border animate-in fade-in slide-in-from-top-4 duration-500 ${result.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                            }`}>
                            <div className="flex items-center gap-3 mb-2">
                                {result.success ? (
                                    <CheckCircle2 className="text-emerald-500" size={24} />
                                ) : (
                                    <ShieldAlert className="text-red-500" size={24} />
                                )}
                                <h3 className={`font-bold ${result.success ? 'text-emerald-900' : 'text-red-900'}`}>
                                    {result.message}
                                </h3>
                            </div>
                            {result.details && (
                                <pre className="mt-4 p-4 bg-black/5 rounded-xl text-xs font-mono overflow-auto max-h-60 text-gray-700">
                                    {JSON.stringify(result.details, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="text-center text-gray-400 text-xs font-medium uppercase tracking-widest opacity-50">
                DB System v2.1 • Resilient Mode Active
            </div>
        </div>
    );
}
