"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import React, { useState, useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { X, Loader2, Phone } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Link, useRouter } from '@/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneInput } from '@/components/ui/phone-input';
import { useTranslations } from 'next-intl';
import Lottie from 'lottie-react';
import successAnimation from '@/components/success-animation.json';
import styles from './AuthModal.module.css';

// Faqat shu sayt ichidagi manzillarga yo'naltirish — open-redirect himoyasi
const getSafeCallbackUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const cb = params.get('callbackUrl');
    if (!cb) return null;
    try {
        const u = new URL(cb, window.location.origin);
        if (u.origin !== window.location.origin) return null;
        return u.pathname + u.search + u.hash;
    } catch {
        return null;
    }
};

export default function AuthModal() {
    const t = useTranslations('Auth');
    const router = useRouter();
    const { isModalOpen, closeAuthModal, openAuthModal } = useUserStore();
    const { data: session } = useSession();

    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const redirectTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Fokus boshqaruvi (a11y)
    const modalRef = React.useRef<HTMLDivElement>(null);
    const phoneInputRef = React.useRef<HTMLInputElement>(null);
    const otpInputRef = React.useRef<HTMLInputElement>(null);
    const openedByRef = React.useRef<HTMLElement | null>(null);

    // Handle Query Params (e.g. ?auth=login or ?auth=register)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const authParam = params.get('auth');
        if (authParam === 'login') {
            setMode('login');
            openAuthModal();
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        } else if (authParam === 'register') {
            setMode('register');
            openAuthModal();
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }

        const resetSuccess = params.get('resetSuccess');
        if (resetSuccess === 'true') {
            setIsSuccess(true);
            openAuthModal();
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            setTimeout(() => {
                window.location.reload();
            }, 5000);
        }
    }, [openAuthModal]);

    // Escape bilan yopish
    useEffect(() => {
        if (!isModalOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeAuthModal();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isModalOpen, closeAuthModal]);

    // Form states
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [phone, setPhone] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(120);

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

    useEffect(() => {
        if (!isVerifying || timeLeft <= 0) return;
        const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timerId);
    }, [isVerifying, timeLeft]);

    // Scroll-lock: modal ochiq paytida fon sahifa scroll qilinmaydi (iOS uchun ham)
    useEffect(() => {
        if (isModalOpen) {
            const originalOverflow = document.body.style.overflow;
            const originalPaddingRight = document.body.style.paddingRight;
            const originalPosition = document.body.style.position;
            const originalTop = document.body.style.top;
            const originalWidth = document.body.style.width;
            const scrollY = window.scrollY;
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

            document.body.style.overflow = 'hidden';
            // Scrollbar yo'qolishi tufayli layout sakrashini kompensatsiya qilish
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
            // iOS Safari: overflow:hidden yetarli emas — body'ni fixed qilib scroll pozitsiyani saqlaymiz
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';

            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.paddingRight = originalPaddingRight;
                document.body.style.position = originalPosition;
                document.body.style.top = originalTop;
                document.body.style.width = originalWidth;
                window.scrollTo(0, scrollY);
            };
        } else {
            setTimeout(() => {
                setIsVerifying(false);
                setOtp('');
                setIsSuccess(false);
            }, 300);
        }
    }, [isModalOpen]);

    // Fokus: ochilganda telefon maydoniga, yopilganda ochgan tugmaga qaytarish
    useEffect(() => {
        if (isModalOpen) {
            openedByRef.current = document.activeElement as HTMLElement | null;
            const t = setTimeout(() => {
                if (isVerifying) {
                    otpInputRef.current?.focus();
                } else if (phoneInputRef.current) {
                    phoneInputRef.current.focus();
                } else {
                    modalRef.current?.focus();
                }
            }, 150);
            return () => clearTimeout(t);
        } else {
            const opener = openedByRef.current;
            openedByRef.current = null;
            if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
                opener.focus();
            }
        }
    }, [isModalOpen]);

    // Tasdiqlash (OTP) bosqichiga o'tganda kod maydoniga fokus
    useEffect(() => {
        if (isVerifying) {
            const t = setTimeout(() => otpInputRef.current?.focus(), 150);
            return () => clearTimeout(t);
        }
    }, [isVerifying]);

    // Focus trap: Tab modal ichida qoladi, oxirgi elementdan keyin boshiga qaytadi
    const handleTabKey = (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !modalRef.current) return;
        const focusables = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
            )
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && (document.activeElement === first || document.activeElement === modalRef.current)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    useEffect(() => {
        if (session?.user && isModalOpen && !isSuccess) {
            closeAuthModal();
        }
    }, [session, isModalOpen, closeAuthModal, isSuccess]);

    const handleSuccess = (message: string) => {
        setIsSuccess(true);
        if (message) toast.success(message);

        const callbackUrl = getSafeCallbackUrl();

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
            toast.error(t('terms_required'));
            return;
        }
        const phoneDigits = (phone || '').replace(/\D/g, '');
        if (phoneDigits.length < 12) {
            toast.error(t('phone_invalid'));
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
                if (data.code === 'PHONE_INVALID') {
                    toast.error(t('phone_invalid'));
                } else {
                    toast.error(data.message || t('system_error'));
                }
                return;
            }

            setTimeLeft(120);
            setIsVerifying(true);
            toast.success(t('code_sent_ok'));
        } catch (error) {
            toast.error(t('system_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const performVerification = async (otpValue: string) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
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
                otp: otpValue,
                name: fullName,
                deviceId: dId || undefined,
                deviceName: dName,
                fingerprint,
                redirect: false,
            });

            if (result?.error) {
                if (result.error.includes("ACCOUNT_LOCKED")) {
                    toast.error(t('account_locked'));
                } else if (result.error.includes("OTP_INVALID")) {
                    toast.error(t('otp_invalid'));
                    setOtp("");
                } else if (result.error.includes("USER_NOT_FOUND")) {
                    toast.error(t('user_not_found'));
                } else if (result.error.includes("INVALID_NAME")) {
                    toast.error(t('name_invalid'));
                    setIsVerifying(false);
                } else {
                    toast.error(t('login_error_generic'));
                }
                localStorage.removeItem('mergeCartOnLogin');
            } else {
                handleSuccess(mode === 'login' ? t('welcome') : t('register_success'));
            }
        } catch (error) {
            toast.error(t('verify_error'));
            localStorage.removeItem('mergeCartOnLogin');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length === 6) {
            await performVerification(otp);
        } else {
            toast.error(t('code_incomplete'));
        }
    };

    // Auto-verify when code is fully entered
    useEffect(() => {
        if (otp.length === 6 && isVerifying && !isLoading) {
            performVerification(otp);
        }
    }, [otp, isVerifying]);

    const handleSocialLogin = async (provider: string) => {
        if (!termsAccepted) {
            setShowTermsWarning(true);
            setTimeout(() => setShowTermsWarning(false), 2000);
            toast.error(t('terms_required'));
            return;
        }
        if (provider === 'Google') {
            setIsLoading(true);
            try {
                localStorage.setItem('mergeCartOnLogin', 'true');
                const callbackUrl = getSafeCallbackUrl() || window.location.origin;

                await signIn('google', {
                    callbackUrl,
                    redirect: true
                });
            } catch (error) {
                toast.error(t('google_error'));
                localStorage.removeItem('mergeCartOnLogin');
                setIsLoading(false);
            }
        } else {
            toast.info(t('provider_soon', { provider }));
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
                        transition={{ duration: 0.3 }}
                        onClick={closeAuthModal}
                        className={styles.overlay}
                    />

                    {/* Modal Wrapper */}
                    <motion.div
                        initial={{ x: '-50%', y: '-50%', opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
                        animate={{ x: '-50%', y: '-50%', opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ x: '-50%', y: '-50%', opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className={styles.modalWrapper}
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('title')}
                        ref={modalRef}
                        tabIndex={-1}
                        onKeyDown={handleTabKey}
                    >
                        <button title={t('close')} aria-label={t('close')} onClick={closeAuthModal} className={styles.closeBtn}>
                            <X size={20} />
                        </button>
                        {/* 1. Left Panel: Branding & Promo */}
                        <div className={styles.leftPanel}>
                            <div className={styles.brandContent}>
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                    className="flex justify-start mb-6"
                                >
                                    <div className={styles.lottieContainer}>
                                        {lockAnimationData && (
                                            <Lottie
                                                animationData={lockAnimationData}
                                                loop={true}
                                                className="w-full h-full"
                                            />
                                        )}
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ y: 30, opacity: 0, filter: 'blur(10px)' }}
                                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                                    transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <h2 className={styles.promoTitle}>
                                        {mode === 'login' ? t('title_login') : t('title_register')}
                                        <span>
                                            {mode === 'login' ? (
                                                <>{t('sub_login')}</>
                                            ) : (
                                                t('sub_register')
                                            )}
                                        </span>
                                    </h2>
                                    <p className={styles.promoDesc}>
                                        {mode === 'login' ? t('desc_login') : t('desc_register')}
                                    </p>
                                </motion.div>
                            </div>
                        </div>

                        {/* 2. Right Panel: Actual Forms */}
                        <div className={styles.rightPanel}>

                            <AnimatePresence mode="wait">
                                {isSuccess ? (
                                    <motion.div
                                        key="success-view"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex-1 flex flex-col items-center justify-center text-center py-10"
                                    >
                                        <div className="w-40 h-40 mb-6">
                                            <Lottie animationData={successAnimation} loop={false} />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 mb-2">{t('success_title')}</h3>
                                        <p className="text-slate-500 font-medium">{t('success_message')}</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="form-view"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex-1 flex flex-col justify-center"
                                    >
                                        <div className={styles.formHeader}>
                                            <h2>{isVerifying ? t('verify_title') : (mode === 'login' ? t('login_title') : t('register'))}</h2>
                                            <p>{isVerifying ? t('enter_code') : t('enter_info')}</p>
                                        </div>

                                        <form onSubmit={isVerifying ? handleVerifyOTP : handleSendOTP} className="space-y-2 lg:space-y-4">
                                            {isVerifying ? (
                                                <div className="space-y-6">
                                                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <Phone size={18} className="text-blue-600" />
                                                            <span className="font-bold text-slate-700">{phone}</span>
                                                        </div>
                                                        <button type="button" onClick={() => setIsVerifying(false)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">{t('change_number')}</button>
                                                    </div>

                                                    <div className={styles.inputGroup}>
                                                        <label className={styles.inputLabel}>{t('sms_code')}</label>
                                                        <input
                                                            ref={otpInputRef}
                                                            type="text"
                                                            placeholder="······"
                                                            value={otp}
                                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                            required
                                                            className={`${styles.inputField} text-center tracking-[8px] text-2xl font-black placeholder:tracking-[2px]`}
                                                        />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <button type="submit" className={styles.primaryBtn} disabled={isLoading}>
                                                            {isLoading ? <Loader2 className="animate-spin" /> : t('confirm')}
                                                        </button>

                                                        {timeLeft > 0 ? (
                                                            <div className="text-center text-xs font-bold text-slate-400">
                                                                {t('resend_in')} <span className="text-blue-600 ml-1">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                                                            </div>
                                                        ) : (
                                                            <button type="button" onClick={handleSendOTP} className="w-full text-center text-xs font-black text-blue-600 hover:underline uppercase">{t('resend')}</button>
                                                        )}

                                                        <div className="relative py-2">
                                                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                                                            <div className="relative flex justify-center text-[10px] font-black text-slate-300 uppercase"><span className="bg-white px-2">{t('or_continue')}</span></div>
                                                        </div>

                                                        <a
                                                            href={`https://t.me/Hadaf_supportbot?start=verify_${phone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-full h-12 flex items-center justify-center gap-2 bg-[#2ba6e1] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all"
                                                        >
                                                            <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.774-.417-1.2.258-1.902.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.445.895-.694 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                                                            {t('via_telegram')}
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {mode === 'register' && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className={styles.inputGroup}>
                                                                <label className={styles.inputLabel}>{t('first_name')}</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Aziz"
                                                                    value={name}
                                                                    onChange={(e) => setName(e.target.value)}
                                                                    required
                                                                    className={styles.inputField}
                                                                />
                                                            </div>
                                                            <div className={styles.inputGroup}>
                                                                <label className={styles.inputLabel}>{t('last_name')}</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Rahimov"
                                                                    value={surname}
                                                                    onChange={(e) => setSurname(e.target.value)}
                                                                    required
                                                                    className={styles.inputField}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className={styles.inputGroup}>
                                                        <label className={styles.inputLabel}>{t('phone_label')}</label>
                                                        <PhoneInput
                                                            ref={phoneInputRef}
                                                            value={phone}
                                                            onChange={setPhone}
                                                            required
                                                            className={styles.inputField}
                                                        />
                                                    </div>

                                                    <div className="flex items-start gap-2 py-1">
                                                        <input
                                                            type="checkbox"
                                                            id="terms"
                                                            checked={termsAccepted}
                                                            onChange={(e) => {
                                                                setTermsAccepted(e.target.checked);
                                                                if (e.target.checked) setShowTermsWarning(false);
                                                            }}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 mt-1 cursor-pointer"
                                                        />
                                                        <label htmlFor="terms" className={`text-[10px] font-medium leading-normal cursor-pointer ${showTermsWarning ? 'text-red-500' : 'text-slate-400'}`}>
                                                            {t.rich('terms', {
                                                                oferta: (chunks) => <Link href="/terms" className="text-blue-600 font-bold hover:underline">{chunks}</Link>,
                                                                siyosat: (chunks) => <Link href="/privacy" className="text-blue-600 font-bold hover:underline">{chunks}</Link>,
                                                            })}
                                                        </label>
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        className={styles.primaryBtn}
                                                        disabled={isLoading || (!termsAccepted && !isVerifying)}
                                                        style={{ marginTop: '4px' }}
                                                    >
                                                        {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? t('get_code') : t('register_btn'))}
                                                    </button>
                                                </>
                                            )}
                                        </form>

                                        {!isVerifying && (
                                            <>
                                                <div className="relative py-2">
                                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                                                    <div className="relative flex justify-center text-[10px] font-black text-slate-300 uppercase"><span className="bg-white px-3">{t('or_continue')}</span></div>
                                                </div>

                                                <div className="grid grid-cols-1">
                                                    <button
                                                        onClick={() => handleSocialLogin("Google")}
                                                        className="h-[46px] flex items-center justify-center gap-3 border-2 border-slate-50 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all"
                                                    >
                                                        <svg className="w-5 h-5" viewBox="0 0 48 48">
                                                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                                                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                                                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                                                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C40.483,35.58,44,30.208,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                                                        </svg>
                                                        {t('google_login')}
                                                    </button>
                                                </div>

                                                <p className="mt-4 text-center text-xs font-medium text-slate-400">
                                                    {mode === 'login' ? t('no_account') : t('have_account')}
                                                    <button
                                                        type="button"
                                                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                                        className="ml-2 text-blue-600 font-black hover:underline"
                                                    >
                                                        {mode === 'login' ? t('register') : t('login_title')}
                                                    </button>
                                                </p>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
