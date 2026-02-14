"use client";

import { useState, useEffect } from "react";
import { Lock, Fingerprint, Loader2, Delete, ChevronLeft, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/useUserStore";
import { startBiometricLogin } from "@/components/Auth/BiometricManager";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function PinLock() {
    const t = useTranslations('Profile');
    const { user, isAuthenticated } = useUserStore();
    const [isLocked, setIsLocked] = useState(false);
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user?.hasPin) {
            const lastUnlock = sessionStorage.getItem('last_unlock');
            const now = Date.now();
            if (!lastUnlock || (now - parseInt(lastUnlock)) > 30 * 60 * 1000) {
                setIsLocked(true);
            }
        } else {
            setIsLocked(false);
        }
    }, [isAuthenticated, user]);

    const handlePinInput = (digit: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + digit);
            setError(false);
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError(false);
    };

    const verifyPin = async (currentPin: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/pin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: currentPin })
            });

            if (res.ok) {
                unlock();
            } else {
                setError(true);
                setPin("");
                toast.error(t('password_error'));
            }
        } catch (error) {
            toast.error(t('system_error'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (pin.length === 4 && !isLoading) {
            const timer = setTimeout(() => verifyPin(pin), 500);
            return () => clearTimeout(timer);
        }
    }, [pin]);

    const handleBiometric = async () => {
        setIsLoading(true);
        try {
            const result = await startBiometricLogin();
            if (result) {
                unlock();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const unlock = () => {
        sessionStorage.setItem('last_unlock', Date.now().toString());
        setIsLocked(false);
        setPin("");
    };

    if (!isLocked) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-between py-12 px-6 overflow-hidden"
            >
                <div className="w-full max-w-sm flex flex-col items-center space-y-12">
                    {/* Header */}
                    <div className="flex flex-col items-center space-y-6">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 rounded-full bg-[#7C3AED] flex items-center justify-center text-white shadow-xl shadow-purple-200"
                        >
                            <Lock size={36} fill="white" />
                        </motion.div>
                        <div className="text-center space-y-1">
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{t('pin_enter_title')}</h2>
                            <p className="text-gray-400 font-medium text-sm">Use PIN / Touch ID</p>
                        </div>
                    </div>

                    {/* PIN Indicators */}
                    <div className="flex gap-5">
                        {[1, 2, 3, 4].map((i) => (
                            <motion.div
                                key={i}
                                animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                                transition={{ duration: 0.4 }}
                                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${pin.length >= i
                                        ? error
                                            ? "border-red-500 bg-red-50 text-red-500"
                                            : "border-purple-200 bg-purple-50 text-purple-600"
                                        : "border-gray-100 bg-gray-50/50"
                                    }`}
                            >
                                {pin.length >= i && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="text-2xl font-bold leading-none mt-1"
                                    >
                                        *
                                    </motion.span>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-y-6 gap-x-8 w-full max-w-[320px]">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <NumpadButton key={n} value={n.toString()} onClick={handlePinInput} />
                        ))}
                        <button
                            onClick={handleBiometric}
                            className="w-20 h-20 flex items-center justify-center rounded-full hover:bg-gray-50 active:scale-90 transition-all text-gray-900 border border-gray-100 shadow-sm"
                        >
                            <Fingerprint size={32} strokeWidth={1.5} />
                        </button>
                        <NumpadButton value="0" onClick={handlePinInput} />
                        <button
                            onClick={handleBackspace}
                            className="w-20 h-20 flex items-center justify-center rounded-full hover:bg-gray-50 active:scale-90 transition-all text-gray-900 border border-gray-100 shadow-sm"
                        >
                            <Delete size={32} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col items-center space-y-6 w-full max-w-sm">
                    {isLoading && <Loader2 className="animate-spin text-purple-600" size={32} />}
                    <button
                        onClick={() => {
                            const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "HadafMarketBot";
                            window.open(`https://t.me/${botUsername}?start=recovery`, '_blank');
                        }}
                        className="text-[#7C3AED] font-bold text-lg hover:underline transition-all"
                    >
                        {t('pin_forgot')}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function NumpadButton({ value, onClick }: { value: string; onClick: (v: string) => void }) {
    return (
        <button
            onClick={() => onClick(value)}
            className="w-20 h-20 flex items-center justify-center text-3xl font-medium text-gray-900 rounded-full bg-gray-50/50 hover:bg-purple-600 hover:text-white active:scale-95 transition-all border border-gray-100 shadow-sm"
        >
            {value}
        </button>
    );
}
