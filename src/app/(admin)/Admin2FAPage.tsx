"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck, ShieldAlert, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function Admin2FAPage({ userId }: { userId: string }) {
    const { update } = useSession();
    const [status, setStatus] = useState('PENDING'); // PENDING, APPROVED, REJECTED
    const [init, setInit] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!init) {
            setInit(true);
            fetch('/api/admin/2fa-request', { method: 'POST' }).catch(() => {});
        }

        const interval = setInterval(async () => {
             try {
                const res = await fetch('/api/admin/2fa-status');
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'APPROVED') {
                        clearInterval(interval);
                        setStatus('APPROVED');
                        toast.success("Tasdiqlandi! Panelga o'tilmoqda...");
                        setTimeout(async () => {
                            await update({ admin2fa: true });
                            window.location.reload();
                        }, 1500);
                    } else if (data.status === 'REJECTED') {
                        clearInterval(interval);
                        setStatus('REJECTED');
                        toast.error("Kirish rad etildi!");
                        setTimeout(() => window.location.href = '/', 2000);
                    }
                }
             } catch (e) {}
        }, 2000);

        return () => clearInterval(interval);
    }, [init, update]);

    if (!mounted) return <div className="min-h-screen bg-[#F8FAFC]" />;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] relative overflow-hidden" suppressHydrationWarning>
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/5 rounded-full blur-[120px]" />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 p-10 bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl shadow-blue-900/5 flex flex-col items-center max-w-sm w-full text-center border border-white mx-4"
            >
                <div className="relative w-40 h-40 mb-4">
                    <AnimatePresence mode="wait">
                        {status === 'PENDING' && (
                            <motion.div 
                                key="pending"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="w-full h-full flex items-center justify-center"
                            >
                                <DotLottieReact
                                    src="https://lottie.host/61f62622-a00b-4dd0-972d-db242d8c23e8/MUN7cjkdl4.json"
                                    loop
                                    autoplay
                                />
                            </motion.div>
                        )}

                        {status === 'APPROVED' && (
                            <motion.div 
                                key="approved"
                                initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                className="flex items-center justify-center w-full h-full"
                            >
                                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-xl shadow-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="w-14 h-14 text-white" />
                                </div>
                            </motion.div>
                        )}

                        {status === 'REJECTED' && (
                            <motion.div 
                                key="rejected"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1.1, opacity: 1 }}
                                className="flex items-center justify-center w-full h-full"
                            >
                                <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-red-600 rounded-full shadow-xl shadow-rose-500/20 flex items-center justify-center">
                                    <AlertCircle className="w-14 h-14 text-white" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <h2 className="text-2xl font-bold mb-3 text-slate-800 tracking-tight">
                    {status === 'PENDING' ? 'Xavfsizlik tekshiruvi' : status === 'APPROVED' ? 'Kirish tasdiqlandi' : 'Kirish bekor qilindi'}
                </h2>
                <p className="text-slate-500 mb-8 text-[15px] leading-relaxed px-2">
                    {status === 'PENDING' 
                        ? 'Tizimga kirishni Telegram boti orqali tasdiqlang. Biz sizga xabar yubordik.' 
                        : status === 'APPROVED' 
                        ? 'Xavfsizlik tekshiruvi muvaffaqiyatli o\'tdi. Panelga yo\'naltirilmoqda...' 
                        : 'Ushbu urinish xavfsizlik maqsadida rad etildi.'}
                </p>

                {status === 'PENDING' && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 rounded-2xl border border-blue-100/50">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <span className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Tasdiqlash kutilmoqda...</span>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
