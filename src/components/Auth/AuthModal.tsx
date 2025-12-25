"use client";

import { useState } from 'react';
import styles from './AuthModal.module.css';
import { useUserStore } from '@/store/useUserStore';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';

export default function AuthModal() {
    const { isModalOpen, closeAuthModal, setUser } = useUserStore();
    const tAuth = useTranslations('Auth');
    const tHeader = useTranslations('Header');
    const router = useRouter();

    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    if (!isModalOpen) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                toast.error(tAuth('login_error'));
            } else {
                toast.success(tAuth('welcome'));
                // Optionally verify session here or just trust functionality
                closeAuthModal();
                router.refresh();
                resetForm();
            }
        } catch (error) {
            toast.error("Tizim xatosi"); // System error (maybe add to JSON later)
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Ro'yxatdan o'tishda xatolik");
                return;
            }

            // Auto login after register
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.ok) {
                toast.success("Muvaffaqiyatli ro'yxatdan o'tildi");
                closeAuthModal();
                router.refresh();
                resetForm();
            }
        } catch (error) {
            toast.error("Server xatosi");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setMode('login');
    };

    return (
        <>
            <div className={styles.overlay} onClick={closeAuthModal}></div>
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={closeAuthModal}>
                    <X size={24} />
                </button>

                <div className={styles.content}>
                    <div className={styles.header}>
                        <h3>{mode === 'login' ? tHeader('kirish') : tAuth('register')}</h3>
                        <p>{tAuth('subtitle')}</p>
                    </div>

                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${mode === 'login' ? styles.activeTab : ''}`}
                            onClick={() => setMode('login')}
                        >
                            {tHeader('kirish')}
                        </button>
                        <button
                            className={`${styles.tab} ${mode === 'register' ? styles.activeTab : ''}`}
                            onClick={() => setMode('register')}
                        >
                            {tAuth('register')}
                        </button>
                    </div>

                    <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
                        {mode === 'register' && (
                            <div className={styles.inputGroup}>
                                <label>{tAuth('name')}</label>
                                <div className={styles.inputWrapper}>
                                    <User size={20} className={styles.inputIcon} />
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
                            <label>{tAuth('email')}</label> {/* Use translated Label if possible, but 'Email' is international mostly. uz.json has 'email': 'Elektron pochta' under Profile. I can use Profile.email? Or just Email. */}
                            <div className={styles.inputWrapper}>
                                <Mail size={20} className={styles.inputIcon} />
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label>{tAuth('password')}</label>
                            <div className={styles.inputWrapper}>
                                <Lock size={20} className={styles.inputIcon} />
                                <input
                                    type="password"
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                mode === 'login' ? tHeader('kirish') : tAuth('register')
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
