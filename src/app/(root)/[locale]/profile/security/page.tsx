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
        <div className="space-y-6 max-w-2xl mx-auto pb-10">
            {status === "loading" && (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <Loader2 size={40} className="animate-spin text-primary mb-4" />
                    <p className="text-text-muted font-medium">{t('loading') || "Yuklanmoqda..."}</p>
                </div>
            )}

            {status !== "loading" && (
                <>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{t('security_settings')}</h1>
                                <p className="text-text-muted mt-1">{t('security_subtitle')}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">{t('current_password')}</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                                    <input
                                        type="password"
                                        {...register("currentPassword")}
                                        className={`w-full h-12 pl-12 pr-4 rounded-xl border transition-all outline-none ${errors.currentPassword ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                                            }`}
                                        placeholder="••••••••"
                                    />
                                </div>
                                {errors.currentPassword && <p className="text-red-500 text-xs font-medium">{errors.currentPassword.message}</p>}
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">{t('new_password')}</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                                        <input
                                            type="password"
                                            {...register("newPassword")}
                                            className={`w-full h-12 pl-12 pr-4 rounded-xl border transition-all outline-none ${errors.newPassword ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                                                }`}
                                            placeholder={t('error_length')}
                                        />
                                    </div>
                                    {errors.newPassword && <p className="text-red-500 text-xs font-medium">{errors.newPassword.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">{t('confirm_password')}</label>
                                    <input
                                        type="password"
                                        {...register("confirmPassword")}
                                        className={`w-full h-12 px-4 rounded-xl border transition-all outline-none ${errors.confirmPassword ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                                            }`}
                                        placeholder={t('confirm_password')}
                                    />
                                    {errors.confirmPassword && <p className="text-red-500 text-xs font-medium">{errors.confirmPassword.message}</p>}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-primary text-white h-12 px-8 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
                                >
                                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                    <span>{t('update_password')}</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex gap-4">
                        <div className="text-blue-600 pt-1">
                            <ShieldAlert size={24} />
                        </div>
                        <div className="space-y-1 flex-1">
                            <h4 className="font-bold text-blue-900">{t('2fa_title')}</h4>
                            <p className="text-sm text-blue-800/80 leading-relaxed">
                                {t('2fa_desc')}
                            </p>
                            <button
                                onClick={toggle2FA}
                                disabled={is2FALoading}
                                className="text-blue-700 font-bold text-sm mt-3 flex items-center gap-2 hover:underline disabled:opacity-50"
                            >
                                {is2FALoading && <Loader2 size={16} className="animate-spin" />}
                                {twoFactorEnabled ? t('2fa_disable') : t('2fa_enable')}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        {/* Biometric Management Component */}
                        <BiometricManager />
                    </div>
                </>
            )}
        </div>
    );
}

import BiometricManager from "@/components/Auth/BiometricManager";
