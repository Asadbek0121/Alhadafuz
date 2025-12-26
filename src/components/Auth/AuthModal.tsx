"use client";

import { useState } from 'react';
import styles from './AuthModal.module.css';
import { useUserStore } from '@/store/useUserStore';
import { X, Mail, Lock, User, Loader2, ArrowRight, Eye, EyeOff, Phone } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import TelegramLoginButton from './TelegramLoginButton';

export default function AuthModal() {
    const { isModalOpen, closeAuthModal } = useUserStore();
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.user && isModalOpen) {
            closeAuthModal();
        }
    }, [session, isModalOpen, closeAuthModal]);

    const tAuth = useTranslations('Auth');
    const tHeader = useTranslations('Header');
    const router = useRouter();

    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    if (!isModalOpen) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Signal to merge cart on next session sync
            localStorage.setItem('mergeCartOnLogin', 'true');

            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Email yoki parol noto'g'ri");
                // Remove flag if failed
                localStorage.removeItem('mergeCartOnLogin');
            } else {
                toast.success("Xush kelibsiz!");
                closeAuthModal();
                // Force reload to ensure session is active in all components
                window.location.reload();
            }
        } catch (error) {
            toast.error("Tizim xatosi");
            localStorage.removeItem('mergeCartOnLogin');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Signal to merge cart
            localStorage.setItem('mergeCartOnLogin', 'true');

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Ro'yxatdan o'tishda xatolik");
                localStorage.removeItem('mergeCartOnLogin');
                return;
            }

            // Auto login after register
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.ok) {
                toast.success(`Xush kelibsiz, ${name}!`);
                closeAuthModal();
                window.location.reload();
            }
        } catch (error) {
            toast.error("Server xatosi");
            localStorage.removeItem('mergeCartOnLogin');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: string) => {
        if (provider === 'Google') {
            setIsLoading(true);
            try {
                // Signal to merge cart
                localStorage.setItem('mergeCartOnLogin', 'true');
                await signIn('google', { callbackUrl: window.location.href });
            } catch (error) {
                toast.error("Google orqali kirishda xatolik");
                localStorage.removeItem('mergeCartOnLogin');
                setIsLoading(false);
            }
        } else {
            toast.info(`${provider} orqali kirish tez orada qo'shiladi`);
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setPhone('');
        setMode('login');
        setShowPassword(false);
    };

    return (
        <>
            <div className={styles.overlay} onClick={closeAuthModal}></div>
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={closeAuthModal}>
                    <X size={24} />
                </button>

                <div className={styles.headerRow}>
                    <h3>{mode === 'login' ? 'Tizimga kirish' : "Ro'yxatdan o'tish"}</h3>
                    <a href="/help" className={styles.helpLink}>Yordam kerakmi?</a>
                </div>

                <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className={styles.formContainer}>
                    {mode === 'register' && (
                        <div className={styles.inputGroup}>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="text"
                                    placeholder="Ism Familiya"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className={styles.input}
                                />
                            </div>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <div className={styles.inputWrapper}>
                            <input
                                type="email"
                                placeholder="Elektron pochta"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={styles.input}
                            />
                        </div>
                    </div>

                    {mode === 'register' && (
                        <div className={styles.inputGroup}>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="tel"
                                    placeholder="Telefon raqam"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    className={styles.input}
                                    minLength={9}
                                />
                            </div>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Parol"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className={styles.input}
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={styles.eyeBtn}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {mode === 'login' && (
                        <div className="flex justify-end mb-4">
                            <a href="/auth/forgot-password" className={styles.forgotLink}>Parolni unutdingizmi?</a>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            mode === 'login' ? 'KIRISH' : "RO'YXATDAN O'TISH"
                        )}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>Ijtimoiy tarmoqlar orqali</span>
                </div>

                <div className={styles.socialButtons}>
                    <button className={styles.socialBtn} onClick={() => handleSocialLogin("Google")}>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>
                    <TelegramLoginButton botName="HadafMarketBot" />
                </div>

                <div className={styles.footer}>
                    {mode === 'login' ? (
                        <>
                            Hisobingiz yo'qmi?{' '}
                            <button onClick={() => setMode('register')} className={styles.linkBtn}>Ro'yxatdan o'tish</button>
                        </>
                    ) : (
                        <>
                            Allaqachon hisobingiz bormi?{' '}
                            <button onClick={() => setMode('login')} className={styles.linkBtn}>Tizimga kirish</button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
