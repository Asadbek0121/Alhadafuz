"use client";

import { useEffect, useState } from 'react';
import { Download, X, Apple, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallAppButtons() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showIosInstructions, setShowIosInstructions] = useState(false);
    const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
    const [isInBrowser, setIsInBrowser] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        setIsInBrowser(!isStandalone);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleAndroidInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setDeferredPrompt(null);
        } else {
            setShowAndroidInstructions(true);
        }
    };

    if (!isInBrowser) return null;

    return (
        <div className="w-full max-w-sm">
            <div className="flex flex-col sm:flex-row gap-2.5 p-1.5 bg-white/5 rounded-[1.4rem] border border-white/10 backdrop-blur-md">

                {/* iOS Button - Sleek & Compact */}
                <button
                    onClick={() => setShowIosInstructions(true)}
                    className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-[1rem] bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-blue-500/30 transition-all duration-300 group/ios"
                >
                    <Apple size={18} className="text-gray-400 group-hover/ios:text-white group-hover/ios:scale-110 transition-all" />
                    <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">iOS</span>
                        <span className="text-xs font-black text-white">App Store</span>
                    </div>
                </button>

                {/* Android Button - Sleek & Compact */}
                <button
                    onClick={handleAndroidInstall}
                    className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-[1rem] bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-green-500/30 transition-all duration-300 group/android"
                >
                    <Smartphone size={18} className="text-gray-400 group-hover/android:text-white group-hover/android:scale-110 transition-all" />
                    <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Android</span>
                        <span className="text-xs font-black text-white">Google Play</span>
                    </div>
                </button>

            </div>

            {/* Shared Instruction Modal Design - Compact & Quick */}
            <AnimatePresence>
                {(showIosInstructions || showAndroidInstructions) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowIosInstructions(false); setShowAndroidInstructions(false); }} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0d0d0f] w-full max-w-sm rounded-[2rem] p-7 shadow-2xl border border-white/10 overflow-hidden text-center">

                            <div className="mb-6 flex justify-center">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${showIosInstructions ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                                    {showIosInstructions ? <Apple size={28} /> : <Smartphone size={28} />}
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-white mb-6">O'rnatish yo'riqnomasi</h3>

                            <div className="space-y-3 text-left mb-8">
                                {(showIosInstructions ? [
                                    { s: 1, t: "Safari pastidagi Ulashish (Share) tugmasini bosing" },
                                    { s: 2, t: "'Add to Home Screen' bandini tanlang" },
                                    { s: 3, t: "Yuqoridagi 'Add' tugmasini bosing" }
                                ] : [
                                    { s: 1, t: "Brauzer menyusidan (uchta nuqta) bosing" },
                                    { s: 2, t: "'Install App' yoki 'Add to Home screen' tanlang" }
                                ]).map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${showIosInstructions ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>{step.s}</span>
                                        <p className="text-[13px] font-bold text-gray-300 leading-snug">{step.t}</p>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => { setShowIosInstructions(false); setShowAndroidInstructions(false); }}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${showIosInstructions ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                            >
                                Tushunarli
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
