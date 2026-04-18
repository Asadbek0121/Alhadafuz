"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import React, { useState, useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { X, Mail, Lock, User, Loader2, Eye, EyeOff, Phone, Fingerprint, CheckCircle2 } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Link, useRouter } from '@/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneInput } from '@/components/ui/phone-input';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Lottie from 'lottie-react';
import successAnimation from '@/components/success-animation.json';

export default function AuthModal() {
    const t = useTranslations('Auth');
    const tp = useTranslations('Profile');
    const router = useRouter();
    const { isModalOpen, closeAuthModal, openAuthModal } = useUserStore();
    const { data: session, status } = useSession();





    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [isBiometricLoading, setIsBiometricLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [biometricLinked, setBiometricLinked] = useState(false);
    const redirectTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Handle Query Params (e.g. ?auth=login or ?auth=register)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const authParam = params.get('auth');
        if (authParam === 'login') {
            setMode('login');
            openAuthModal();
            // Clean up URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        } else if (authParam === 'register') {
            setMode('register');
            openAuthModal();
            // Clean up URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }

        const resetSuccess = params.get('resetSuccess');
        if (resetSuccess === 'true') {
            setIsSuccess(true);
            openAuthModal();
            // Clean up URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            // Final action after animation
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        }

        // Check biometric support
        if (typeof window !== "undefined" && (window as any).PublicKeyCredential) {
            (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then((available: boolean) => setIsBiometricSupported(available));
        }
    }, [openAuthModal]);

    // Form states
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [phone, setPhone] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes timer

    const [isSuccess, setIsSuccess] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsWarning, setShowTermsWarning] = useState(false);
    const [lockAnimationData, setLockAnimationData] = useState(null);

    useEffect(() => {
        fetch('https://lottie.host/57aade87-a0a9-462d-a009-d61c31c649f7/jQGgTt7tQc.json')
            .then(res => res.json())
            .then(data => setLockAnimationData(data))
            .catch(() => {});
    }, []);

    // Timer logic
    useEffect(() => {
        if (!isVerifying || timeLeft <= 0) return;
        const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timerId);
    }, [isVerifying, timeLeft]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
            // Do NOT reset isSuccess here, as it might be set to true before opening
        } else {
            document.body.style.overflow = 'unset';
            // Small timeout to let exit animation finish before state clear
            setTimeout(() => {
                setIsVerifying(false);
                setOtp('');
                setIsSuccess(false); // Reset success state when closed
            }, 300);
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isModalOpen]);

    useEffect(() => {
        if (session?.user && isModalOpen && !isSuccess) {
            closeAuthModal();
        }
    }, [session, isModalOpen, closeAuthModal, isSuccess]);


    const handleSuccess = (message: string) => {
        setIsSuccess(true);
        if (message) toast.success(message);

        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get('callbackUrl');

        if (!callbackUrl && window.location.pathname !== '/') {
            router.push('/');
        }

        redirectTimerRef.current = setTimeout(() => {
            if (callbackUrl) {
                window.location.href = callbackUrl;
            } else {
                window.location.reload();
            }
        }, 3000);
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted) {
            setShowTermsWarning(true);
            setTimeout(() => setShowTermsWarning(false), 2000);
            toast.error("Iltimos, ommaviy oferta va maxfiylik siyosatiga rozilik bildiring");
            return;
        }
        if (!phone || phone.length < 9) {
            toast.error("Telefon raqamni to'g'ri kiriting");
            return;
        }
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, isRegister: mode === 'register' }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Xatolik yuz berdi");
                return;
            }

            setTimeLeft(120);
            setIsVerifying(true);
            toast.success("Tasdiqlash kodi telefoningizga yuborildi");
        } catch (error) {
            toast.error("Server xatosi");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // --- Device Identification ---
            const { getBrowserFingerprint } = await import("@/lib/fingerprint");
            let dId = typeof window !== 'undefined' ? localStorage.getItem('hadaf_device_id') : null;
            if (!dId && typeof window !== 'undefined') {
                dId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                localStorage.setItem('hadaf_device_id', dId);
            }
            const dName = typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) : "Web Browser";
            const fingerprint = getBrowserFingerprint();

            localStorage.setItem('mergeCartOnLogin', 'true');
            
            const fullName = mode === 'register' ? `${name} ${surname}`.trim() : undefined;

            const result = await signIn('credentials', {
                login: phone,
                otp,
                name: fullName,
                deviceId: dId || undefined,
                deviceName: dName,
                fingerprint,
                redirect: false,
            });

            if (result?.error) {
                if (result.error.includes("ACCOUNT_LOCKED")) {
                    toast.error("Xavfsizlik: Hisobingiz bloklandi!");
                } else if (result.error.includes("OTP_INVALID")) {
                    toast.error("Tasdiqlash kodi noto'g'ri yoki vaqti tugagan");
                } else if (result.error.includes("USER_NOT_FOUND")) {
                    toast.error("Hisob topilmadi. Iltimos ro'yxatdan o'ting.");
                } else {
                    toast.error("Kirishda xatolik yuz berdi");
                }
                localStorage.removeItem('mergeCartOnLogin');
            } else {
                handleSuccess(mode === 'login' ? "Xush kelibsiz!" : "Muvaffaqiyatli ro'yxatdan o'tdingiz!");
            }
        } catch (error) {
            toast.error("Tasdiqlashda xatolik");
            localStorage.removeItem('mergeCartOnLogin');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: string) => {
        if (!termsAccepted) {
            setShowTermsWarning(true);
            setTimeout(() => setShowTermsWarning(false), 2000);
            toast.error("Iltimos, ommaviy oferta va maxfiylik siyosatiga rozilik bildiring");
            return;
        }
        if (provider === 'Google') {
            setIsLoading(true);
            try {
                localStorage.setItem('mergeCartOnLogin', 'true');

                const params = new URLSearchParams(window.location.search);
                const callbackUrl = params.get('callbackUrl') || window.location.origin;

                await signIn('google', {
                    callbackUrl,
                    redirect: true
                });
            } catch (error) {
                toast.error("Google orqali kirishda xatolik");
                localStorage.removeItem('mergeCartOnLogin');
                setIsLoading(false);
            }
        } else {
            toast.info(`${provider} orqali kirish tez orada qo'shiladi`);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isModalOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeAuthModal}
                        style={{ zIndex: 99998 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        style={{ zIndex: 99999 }}
                        className="fixed bottom-0 left-0 right-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-white w-full md:w-[440px] rounded-t-[40px] md:rounded-[32px] shadow-2xl overflow-hidden md:min-h-[640px] flex flex-col"
                    >
                        <AnimatePresence mode="wait">
                            {isSuccess ? (
                                <motion.div
                                    key="success-view"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex-1 flex flex-col items-center justify-center p-8 bg-white/40 backdrop-blur-[40px] text-slate-900 text-center relative overflow-hidden min-h-[450px] w-full border-t border-white/50"
                                >
                                    {/* Glass Grain Texture Overlay */}
                                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

                                    <div className="relative z-10 flex flex-col items-center w-full">
                                        <div className="relative w-48 h-48 mb-6">
                                            {/* Lottie Success Animation */}
                                            <Lottie 
                                                animationData={successAnimation} 
                                                loop={false} 
                                                autoplay={true} 
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        </div>

                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.6 }}
                                            className="px-4"
                                        >
                                            <h3 className="text-4xl font-black mb-4 tracking-tight leading-tight text-slate-900 drop-shadow-sm">
                                                {t('success_title')}
                                            </h3>
                                            <p className="text-slate-500/90 font-semibold text-lg leading-relaxed max-w-[280px] mx-auto">
                                                {t('success_message')}
                                            </p>
                                        </motion.div>

                                        {biometricLinked && (
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0, y: 15 }}
                                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                                transition={{ delay: 1 }}
                                                className="mt-10 bg-white/40 backdrop-blur-3xl px-6 py-4 rounded-3xl border border-white/50 flex items-center gap-3 shadow-xl ring-1 ring-emerald-500/10"
                                            >
                                                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                    <CheckCircle2 size={20} className="text-white" />
                                                </div>
                                                <span className="text-sm font-black tracking-wide text-emerald-900/80">{tp('biometric_setup_success')}</span>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form-view"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="p-6 pt-8 md:p-10 md:pt-12 custom-scrollbar overflow-y-auto max-h-[90vh] pb-12 flex-1 flex flex-col relative"
                                >
                                    {/* Drag Handle */}
                                    <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>

                                    {/* Close Button */}
                                    <button title="Yopish"
                                        onClick={closeAuthModal}
                                        className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors z-10 border border-slate-200/50 shadow-sm"
                                    >
                                        <X size={20} />
                                    </button>

                                    <div className="flex flex-col items-center mb-8 md:mb-10 text-center">
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className={`flex items-center justify-center mb-4 border border-blue-100/50 rounded-2xl ${(!isVerifying && lockAnimationData) ? 'w-28 h-28 md:w-36 md:h-36 bg-transparent border-transparent' : 'w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-blue-600'}`}
                                        >
                                            {isVerifying ? <Mail size={32} /> : (lockAnimationData ? <Lottie animationData={lockAnimationData} loop autoplay className="w-full h-full scale-[1.2]" /> : <Lock size={32} />)}
                                        </motion.div>
                                        <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
                                            {isVerifying ? 'Tasdiqlash' : (mode === 'login' ? 'Tizimga kirish' : "Ro'yxatdan o'tish")}
                                        </h3>
                                        <div className="text-sm md:text-base font-medium text-slate-500">
                                            {isVerifying ? 'Raqamingizga SMS kod yubordik' : (mode === 'login' ? 'Raqamingizni kiriting va boshlaymiz' : "Yangi hisob yarating")}
                                        </div>
                                    </div>

                                     <form onSubmit={isVerifying ? handleVerifyOTP : handleSendOTP} className="flex flex-col gap-5 relative z-10">
                                        {isVerifying ? (
                                            <div className="space-y-6 animate-fade-in-up">
                                                <div className="inline-flex items-center justify-center w-full gap-2 bg-slate-50 px-4 py-3 rounded-xl mb-2">
                                                    <Phone size={18} className="text-blue-600"/>
                                                    <span className="font-bold text-slate-800 tracking-wide">{phone}</span>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <input title="Kiritish maydoni"
                                                        type="text"
                                                        placeholder="- - - - - -"
                                                        value={otp}
                                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                        required
                                                        className="w-full bg-slate-50/50 border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-bold text-3xl tracking-[12px] text-center text-slate-900 placeholder:text-slate-300 placeholder:tracking-[8px] h-16 rounded-xl"
                                                    />
                                                </div>
                                                <div className="flex flex-col items-center gap-3 mt-2">
                                                    {timeLeft > 0 ? (
                                                        <>
                                                            <div className="text-sm font-semibold text-slate-500 mb-1">
                                                                Amal qilish muddati: <span className="text-blue-600 tracking-wider inline-block w-10 text-center font-bold">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                                                            </div>
                                                            {/* Telegram Bot Button */}
                                                            <a
                                                                href={`https://t.me/Hadaf_supportbot?start=verify_${phone.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-full flex items-center justify-center gap-2 bg-[#2ba6e1] hover:bg-[#228ebd] shadow-lg shadow-[#2ba6e1]/20 text-white py-3.5 rounded-xl font-bold transition-all active:scale-[0.98]"
                                                            >
                                                                <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.774-.417-1.2.258-1.902.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.445.895-.694 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                                                Kodni botdan bepul olish
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={handleSendOTP}
                                                            className="w-full py-3.5 mt-2 bg-slate-100 text-slate-800 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                                        >
                                                            Kodni qayta yuborish
                                                        </button>
                                                    )}
                                                    
                                                    <button title="Tugma"
                                                        type="button"
                                                        onClick={() => setIsVerifying(false)}
                                                        className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 mt-2"
                                                    >
                                                        <span className="text-[16px]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg></span>
                                                        Raqamni o'zgartirish
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {mode === 'register' && (
                                                    <div className="space-y-4 animate-fade-in-up">
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Ism</label>
                                                            <div className="relative group bg-slate-50/50 border border-slate-200/80 rounded-xl focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all duration-300">
                                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                                                <input title="Kiritish maydoni"
                                                                    type="text"
                                                                    placeholder="Ismingiz"
                                                                    value={name}
                                                                    onChange={(e) => setName(e.target.value)}
                                                                    required
                                                                    className="w-full bg-transparent border-none rounded-xl pl-12 pr-4 py-3.5 outline-none font-medium text-slate-900 placeholder:text-slate-400 focus:ring-0"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Familiya</label>
                                                            <div className="relative group bg-slate-50/50 border border-slate-200/80 rounded-xl focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all duration-300">
                                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                                                <input title="Kiritish maydoni"
                                                                    type="text"
                                                                    placeholder="Familiyangiz"
                                                                    value={surname}
                                                                    onChange={(e) => setSurname(e.target.value)}
                                                                    required
                                                                    className="w-full bg-transparent border-none rounded-xl pl-12 pr-4 py-3.5 outline-none font-medium text-slate-900 placeholder:text-slate-400 focus:ring-0"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={`flex flex-col gap-2 ${mode === 'register' ? 'mt-2' : ''}`}>
                                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Telefon raqam</label>
                                                    <div className="relative group bg-slate-50/50 border border-slate-200/80 rounded-xl focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all duration-300 px-1 py-1">
                                                        <PhoneInput
                                                            value={phone}
                                                            onChange={setPhone}
                                                            required
                                                            className="w-full bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 font-bold text-slate-900 placeholder:text-slate-400 text-lg h-[50px]"
                                                            placeholder="+998 00 000 00 00"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                         {!isVerifying && (
                                            <motion.div
                                                animate={showTermsWarning ? { x: [-5, 5, -5, 5, 0] } : {}}
                                                className={`p-3 rounded-xl transition-all mt-2 mb-2 ${showTermsWarning ? 'bg-red-50 border border-red-200' : ''}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="relative flex items-center pt-0.5">
                                                        <input title="Kiritish maydoni"
                                                            type="checkbox"
                                                            id="terms-auth"
                                                            checked={termsAccepted}
                                                            onChange={(e) => {
                                                                setTermsAccepted(e.target.checked);
                                                                if (e.target.checked) setShowTermsWarning(false);
                                                            }}
                                                            className="w-5 h-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-blue-600/30 transition-all cursor-pointer"
                                                        />
                                                    </div>
                                                    <label htmlFor="terms-auth" className="flex-1 text-[13px] text-slate-600 leading-snug cursor-pointer select-none">
                                                        <span className="font-medium">
                                                            Men <Link href="/terms" onClick={closeAuthModal} className="text-blue-600 hover:underline font-bold">Taklif shartlari</Link> va <Link href="/privacy" onClick={closeAuthModal} className="text-blue-600 hover:underline font-bold">Maxfiylik siyosati</Link>ga roziman.
                                                        </span>
                                                    </label>
                                                </div>
                                            </motion.div>
                                        )}

                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="submit"
                                            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-2 tracking-wide
                                                ${isLoading || (!isVerifying && !termsAccepted) 
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200/60' 
                                                    : 'bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] hover:bg-blue-700'
                                                }`}
                                            disabled={isLoading || (!isVerifying && !termsAccepted)}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="animate-spin" />
                                            ) : (
                                                <>
                                                    {isVerifying ? 'Tasdiqlash' : (mode === 'login' ? 'Kodni olish' : "Ro'yxatdan o'tish")}
                                                </>
                                            )}
                                        </motion.button>
                                    </form>

                                     <div className="relative py-8 z-10">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-slate-200/60"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="bg-white px-4 text-slate-400 font-bold tracking-wider uppercase text-[11px]">Yoki</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 mb-4 z-10">
                                        <div className="grid grid-cols-1 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => handleSocialLogin("Google")}
                                                className={`flex items-center justify-center gap-3 py-4 bg-slate-50/50 rounded-xl font-semibold border transition-all ${termsAccepted ? 'text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-[0.98]' : 'text-slate-400 border-slate-200/50 cursor-not-allowed opacity-60'}`}
                                                disabled={!termsAccepted}
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                                Google orqali davom etish
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {!isVerifying && (
                                        <div className="mt-6 text-center z-10 pb-4">
                                            <p className="text-sm font-medium text-slate-500">
                                                {mode === 'login' ? "Hisobingiz yo'qmi?" : "Allaqachon hisobingiz bormi?"} 
                                                <button 
                                                    type="button" 
                                                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                                    className="text-blue-600 font-bold hover:underline decoration-2 underline-offset-4 ml-2 transition-all"
                                                >
                                                    {mode === 'login' ? "Ro'yxatdan o'tish" : "Tizimga kirish"}
                                                </button>
                                            </p>
                                        </div>
                                    )}


                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
