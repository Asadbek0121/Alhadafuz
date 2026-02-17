"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { Lock, ShieldCheck, Key, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function SecurityPage() {
    const t = useTranslations('Profile');
    const { status } = useSession();
    const { user, updateUser, openAuthModal } = useUserStore();
    const [isSaving, setIsSaving] = useState(false);
    const [is2FALoading, setIs2FALoading] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    useEffect(() => {
        if (user) {
            setTwoFactorEnabled(user.twoFactorEnabled || false);
        }
    }, [user]);

    const securitySchema = z.object({
        currentPassword: z.string().min(1, t('current_password_required')),
        newPassword: z.string()
            .min(8, t('error_length'))
            .regex(/[A-Z]/, t('error_uppercase'))
            .regex(/[a-z]/, t('error_lowercase'))
            .regex(/[0-9]/, t('error_number')),
        confirmPassword: z.string()
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: t('error_match'),
        path: ["confirmPassword"],
    });

    type SecurityForm = z.infer<typeof securitySchema>;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SecurityForm>({
        resolver: zodResolver(securitySchema),
    });

    const onSubmit = async (data: SecurityForm) => {
        if (status !== "authenticated") {
            toast.error(t('login_required') || "Iltimos, avval tizimga kiring");
            openAuthModal();
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/user/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'CHANGE_PASSWORD',
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword
                })
            });

            const result = await res.json();

            if (res.ok) {
                toast.success(t('password_success'));
                reset();
            } else {
                toast.error(result.error || t('save_error'));
            }
        } catch (error) {
            toast.error(t('save_error'));
        } finally {
            setIsSaving(false);
        }
    };

    const toggle2FA = async () => {
        if (status !== "authenticated") {
            toast.error(t('login_required') || "Iltimos, avval tizimga kiring");
            openAuthModal();
            return;
        }
        setIs2FALoading(true);
        try {
            const newState = !twoFactorEnabled;
            const res = await fetch('/api/user/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'TOGGLE_2FA',
                    twoFactorEnabled: newState
                })
            });

            const result = await res.json();
            console.log("Toggle 2FA response:", result);

            if (res.ok) {
                setTwoFactorEnabled(result.twoFactorEnabled);
                updateUser({ twoFactorEnabled: result.twoFactorEnabled });
                toast.success(result.message);
            } else {
                toast.error(result.error || t('save_error'));
            }
        } catch (error) {
            console.error(error);
            toast.error(t('save_error'));
        } finally {
            setIs2FALoading(false);
        }
    };

    return (
        <div className="space-y-3.5 md:space-y-6 max-w-2xl mx-auto pb-10 px-0 md:px-4">
            {status === "loading" && (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <Loader2 size={32} className="animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-400 text-sm font-bold">{t('loading') || "Yuklanmoqda..."}</p>
                </div>
            )}

            {status !== "loading" && (
                <>
                    <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3.5 mb-5 md:mb-8">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-50/50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100/50">
                                <Lock size={18} className="md:w-6 md:h-6" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base md:text-2xl font-black text-gray-900 leading-tight">{t('security_settings')}</h1>
                                <p className="text-[11px] md:text-sm text-text-muted mt-0.5 line-clamp-1">{t('security_subtitle')}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 md:space-y-6">
                            {/* Hidden fields to catch browser autofill */}
                            <input type="text" name="username" style={{ display: 'none' }} autoComplete="username" />
                            <input type="password" name="password" style={{ display: 'none' }} autoComplete="current-password" />

                            <div className="space-y-1.5">
                                <label className="text-[11px] md:text-sm font-bold text-gray-700 uppercase tracking-tight ml-1">{t('current_password')}</label>
                                <div className="relative">
                                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="password"
                                        autoComplete="current-password"
                                        {...register("currentPassword")}
                                        className={`w-full h-10 md:h-12 pl-10 md:pl-12 pr-4 text-sm rounded-xl border transition-all outline-none font-medium ${errors.currentPassword ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5"
                                            }`}
                                        placeholder="••••••••"
                                    />
                                </div>
                                {errors.currentPassword && <p className="text-red-500 text-[10px] md:text-xs font-medium">{errors.currentPassword.message}</p>}
                            </div>

                            <div className="space-y-3 pt-1 md:pt-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] md:text-sm font-bold text-gray-700 uppercase tracking-tight ml-1">{t('new_password')}</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            {...register("newPassword")}
                                            className={`w-full h-10 md:h-12 pl-10 md:pl-12 pr-4 text-sm rounded-xl border transition-all outline-none font-medium ${errors.newPassword ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5"
                                                }`}
                                            placeholder={t('error_length')}
                                        />
                                    </div>
                                    {errors.newPassword && <p className="text-red-500 text-[10px] md:text-xs font-medium">{errors.newPassword.message}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] md:text-sm font-bold text-gray-700 uppercase tracking-tight ml-1">{t('confirm_password')}</label>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        {...register("confirmPassword")}
                                        className={`w-full h-10 md:h-12 px-4 text-sm rounded-xl border transition-all outline-none font-medium ${errors.confirmPassword ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5"
                                            }`}
                                        placeholder={t('confirm_password')}
                                    />
                                    {errors.confirmPassword && <p className="text-red-500 text-[10px] md:text-xs font-medium">{errors.confirmPassword.message}</p>}
                                </div>
                            </div>

                            <div className="pt-3 md:pt-6 border-t border-gray-100 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full md:w-auto bg-blue-600 text-white h-10 md:h-12 px-6 md:px-8 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-500/20 text-[13px] md:text-base"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                    <span>{t('update_password').toUpperCase()}</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-blue-50/50 p-4 md:p-6 rounded-2xl border border-blue-100/50 flex gap-3 md:gap-4 shadow-sm">
                        <div className="text-blue-600 pt-0.5">
                            <ShieldAlert size={18} className="md:w-6 md:h-6" />
                        </div>
                        <div className="space-y-1 flex-1">
                            <h4 className="text-[13px] md:text-base font-black text-blue-900 leading-tight">{t('2fa_title')}</h4>
                            <p className="text-[11px] md:text-sm text-blue-800/70 font-medium leading-relaxed">
                                {t('2fa_desc')}
                            </p>
                            <button
                                onClick={toggle2FA}
                                disabled={is2FALoading}
                                className="text-blue-600 font-bold text-[11px] md:text-sm mt-2 md:mt-3 flex items-center gap-2 hover:underline disabled:opacity-50 transition-all active:scale-95"
                            >
                                {is2FALoading && <Loader2 size={12} className="animate-spin" />}
                                {twoFactorEnabled ? t('2fa_disable').toUpperCase() : t('2fa_enable').toUpperCase()}
                            </button>
                        </div>
                    </div>

                    <div className="pt-1">
                        <PinCodeSettings />
                    </div>

                    <div className="pt-1">
                        {/* Biometric Management Component */}
                        <BiometricManager />
                    </div>
                </>
            )}
        </div>
    );
}

import BiometricManager from "@/components/Auth/BiometricManager";
import PinCodeSettings from "@/components/Auth/PinCodeSettings";
