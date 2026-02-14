"use client";

import { useState, useEffect } from "react";
import { Lock, ShieldCheck, ShieldAlert, Loader2, CheckCircle2, Key, Fingerprint, ChevronRight, Smartphone, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";

export default function PinCodeSettings() {
    const t = useTranslations('Profile');
    const { user, updateUser } = useUserStore();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Step 1: Password
    const [password, setPassword] = useState("");
    const [passwordStrength, setPasswordStrength] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
    });

    // Step 2 & 3: PIN
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");

    // Recovery
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState("");
    const [isCounting, setIsCounting] = useState(false);
    const [timer, setTimer] = useState(60);

    const checkPasswordStrength = (pass: string) => {
        setPasswordStrength({
            length: pass.length >= 8,
            uppercase: /[A-Z]/.test(pass),
            lowercase: /[a-z]/.test(pass),
            number: /[0-9]/.test(pass),
        });
    };

    const isPasswordStrong = passwordStrength.length && passwordStrength.uppercase && passwordStrength.lowercase && passwordStrength.number;

    const handleSetPin = async () => {
        if (pin !== confirmPin) {
            toast.error(t('pin_error_mismatch'));
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/user/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'SET_PIN',
                    pin: pin,
                    password: password // We can also update password if needed
                })
            });

            if (res.ok) {
                toast.success(t('pin_success'));
                updateUser({ hasPin: true });
                setStep(1);
                setPin("");
                setConfirmPin("");
                setPassword("");
            } else {
                const data = await res.json();
                toast.error(data.error || t('save_error'));
            }
        } catch (error) {
            toast.error(t('save_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const requestRecovery = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/user/info');
            if (!res.ok) throw new Error("Unauthorized");
            const userData = await res.json().catch(() => ({}));

            // Redirect to Telegram bot
            const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "HadafMarketBot";
            window.open(`https://t.me/${botUsername}?start=recovery`, '_blank');

            toast.success(t('pin_reset_desc'));
            setIsRecoveryMode(true);
            setIsCounting(true);
            setTimer(60);
        } catch (error) {
            toast.error(t('save_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const verifyRecovery = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/user/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'VERIFY_PIN_RECOVERY',
                    recoveryCode
                })
            });

            if (res.ok) {
                toast.success(t('pin_verify_success'));
                setIsRecoveryMode(false);
                setStep(1); // Start from password again
            } else {
                const data = await res.json();
                toast.error(data.error || t('save_error'));
            }
        } catch (error) {
            toast.error(t('save_error'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let interval: any;
        if (isCounting && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setIsCounting(false);
        }
        return () => clearInterval(interval);
    }, [isCounting, timer]);

    const renderStep = () => {
        if (isRecoveryMode) {
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Smartphone size={32} />
                        </div>
                        <h3 className="text-xl font-bold">{t('pin_reset_title')}</h3>
                        <p className="text-text-muted text-sm max-w-xs">{t('pin_reset_desc')}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={6}
                                value={recoveryCode}
                                onChange={(e) => setRecoveryCode(e.target.value)}
                                className="w-full h-14 text-center text-2xl font-bold tracking-widest rounded-2xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                                placeholder="000000"
                            />
                        </div>

                        <button
                            onClick={verifyRecovery}
                            disabled={isLoading || recoveryCode.length < 6}
                            className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                            <span>{t('pin_verify_btn')}</span>
                        </button>

                        <button
                            onClick={requestRecovery}
                            disabled={isCounting || isLoading}
                            className="w-full text-sm font-medium text-primary hover:underline disabled:text-gray-400"
                        >
                            {isCounting ? `${t('pin_resend_tg')} (${timer}s)` : t('pin_resend_tg')}
                        </button>
                    </div>
                </div>
            );
        }

        switch (step) {
            case 1:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                <Key size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{t('pin_step_1')}</h3>
                                <p className="text-text-muted text-sm">{t('pin_password_placeholder')}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        checkPasswordStrength(e.target.value);
                                    }}
                                    className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <StrengthItem label={t('error_length')} active={passwordStrength.length} />
                                <StrengthItem label={t('error_uppercase')} active={passwordStrength.uppercase} />
                                <StrengthItem label={t('error_lowercase')} active={passwordStrength.lowercase} />
                                <StrengthItem label={t('error_number')} active={passwordStrength.number} />
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!isPasswordStrong}
                                className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                            >
                                <span>{t('next')}</span>
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{t('pin_step_2')}</h3>
                                <p className="text-text-muted text-sm">{t('pin_code_placeholder')}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                className="w-full h-14 text-center text-2xl font-bold tracking-[1em] rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                                placeholder="••••"
                            />

                            <button
                                onClick={() => setStep(3)}
                                disabled={pin.length !== 4}
                                className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                            >
                                <span>{t('next')}</span>
                                <ChevronRight size={20} />
                            </button>

                            <button onClick={() => setStep(1)} className="w-full text-sm font-medium text-text-muted">
                                {t('back')}
                            </button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{t('pin_step_3')}</h3>
                                <p className="text-text-muted text-sm">{t('pin_confirm_placeholder')}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                                className="w-full h-14 text-center text-2xl font-bold tracking-[1em] rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                                placeholder="••••"
                            />

                            <button
                                onClick={handleSetPin}
                                disabled={confirmPin.length !== 4 || isLoading}
                                className="w-full h-12 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                <span>{t('pin_set_btn')}</span>
                            </button>

                            <button onClick={() => setStep(2)} className="w-full text-sm font-medium text-text-muted">
                                {t('back')}
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Lock size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{t('pin_setup_title')}</h2>
                        <p className="text-text-muted text-sm mt-1">{t('pin_setup_desc')}</p>
                    </div>
                </div>
                {user?.pinHash && (
                    <button
                        onClick={requestRecovery}
                        className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                        {t('pin_forgot')}
                    </button>
                )}
            </div>

            <div className="max-w-md mx-auto">
                {renderStep()}
            </div>
        </div>
    );
}

function StrengthItem({ label, active }: { label: string; active: boolean }) {
    return (
        <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${active ? "text-green-600" : "text-gray-400"}`}>
            {active ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-30" />}
            <span>{label}</span>
        </div>
    );
}
