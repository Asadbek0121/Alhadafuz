"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Lock, ShieldCheck, Key, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SecurityPage() {
    const t = useTranslations('Profile');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const onSubmit = async (data: SecurityForm) => {
        setIsSaving(true);
        // Simulate API check
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (data.currentPassword === "wrong") {
            showToast('error', t('password_error'));
        } else {
            showToast('success', t('password_success'));
            reset();
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 border ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
                    <span className="font-bold text-sm">{toast.message}</span>
                </div>
            )}

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
                <div className="text-blue-600">
                    <ShieldAlert size={24} />
                </div>
                <div className="space-y-1">
                    <h4 className="font-bold text-blue-900">{t('2fa_title')}</h4>
                    <p className="text-sm text-blue-800/80 leading-relaxed">
                        {t('2fa_desc')}
                    </p>
                    <button className="text-blue-700 font-bold text-sm mt-2 hover:underline">{t('2fa_enable')} →</button>
                </div>
            </div>
        </div>
    );
}
