"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "@/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, KeyRound, Lock, CheckCircle2, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";

const phoneSchema = z.object({
    phone: z.string().refine((v) => v.replace(/\D/g, "").length === 12, { message: " " }),
});

const resetSchema = z.object({
    otp: z.string().length(6, { message: " " }),
    password: z.string().min(6, { message: " " }),
    confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
    message: " ",
    path: ["confirmPassword"],
});

type Step = "PHONE" | "RESET" | "SUCCESS";

export default function ForgotPasswordPage() {
    const t = useTranslations("Auth");
    const [step, setStep] = useState<Step>("PHONE");
    const [isLoading, setIsLoading] = useState(false);
    const [phone, setPhone] = useState("");
    const [timeLeft, setTimeLeft] = useState(0);

    const phoneForm = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema) });
    const resetForm = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });

    // Resend countdown
    useEffect(() => {
        if (timeLeft <= 0) return;
        const interval = setInterval(() => setTimeLeft((s) => s - 1), 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);

    // Step 1: Send OTP
    async function onPhoneSubmit(values: z.infer<typeof phoneSchema>) {
        const digits = values.phone.replace(/\D/g, "");
        if (digits.length !== 12) {
            toast.error(t("phone_invalid"));
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: values.phone }),
            });
            const data = await res.json();

            if (res.ok) {
                setPhone(values.phone);
                setStep("RESET");
                setTimeLeft(120);
                toast.success(t("forgot_sent"));
            } else if (data.code === "PHONE_INVALID") {
                toast.error(t("phone_invalid"));
            } else {
                toast.error(data.message || t("system_error"));
            }
        } catch (error) {
            toast.error(t("system_error"));
        } finally {
            setIsLoading(false);
        }
    }

    // Resend OTP
    async function handleResend() {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            if (res.ok) {
                setTimeLeft(120);
                toast.success(t("code_sent_ok"));
            } else {
                toast.error(t("system_error"));
            }
        } catch (error) {
            toast.error(t("system_error"));
        } finally {
            setIsLoading(false);
        }
    }

    // Step 2: Verify OTP + set new password
    async function onResetSubmit(values: z.infer<typeof resetSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone,
                    token: values.otp,
                    password: values.password,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                setStep("SUCCESS");
                toast.success(t("reset_success"));
            } else {
                toast.error(data.code === "TOKEN_INVALID" || data.code === "TOKEN_EXPIRED"
                    ? t("reset_error")
                    : (data.message || t("system_error")));
            }
        } catch (error) {
            toast.error(t("system_error"));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[440px] px-4"
        >
            <Card className="border shadow-2xl rounded-3xl overflow-hidden bg-white/80 backdrop-blur-lg">
                <CardHeader className="text-center pt-10 pb-6">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                        {step === "PHONE" && <Phone size={32} />}
                        {step === "RESET" && <KeyRound size={32} />}
                        {step === "SUCCESS" && <CheckCircle2 size={32} className="text-green-600" />}
                    </div>

                    <CardTitle className="text-2xl font-black tracking-tight text-gray-900 mb-2">
                        {step === "PHONE" && t("forgot_title")}
                        {step === "RESET" && t("enter_code")}
                        {step === "SUCCESS" && t("success_title")}
                    </CardTitle>

                    <CardDescription className="text-gray-500 text-base px-6">
                        {step === "PHONE" && t("forgot_desc")}
                        {step === "RESET" && t("code_sent")}
                        {step === "SUCCESS" && t("reset_success_desc")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 px-8 pb-8">
                    <AnimatePresence mode="wait">
                        {step === "PHONE" && (
                            <motion.form
                                key="phone-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
                                className="space-y-5"
                            >
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">{t("phone_label")}</Label>
                                    <PhoneInput
                                        value={phoneForm.watch("phone") || ""}
                                        onChange={(v) => phoneForm.setValue("phone", v, { shouldValidate: true })}
                                        placeholder="+998 (__) ___-__-__"
                                        className="h-14 bg-gray-50/50 border-gray-200 rounded-2xl text-lg"
                                    />
                                </div>
                                <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-lg">
                                    {isLoading ? <Loader2 className="animate-spin" /> : t("get_code")}
                                </Button>

                                <div className="relative py-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-100"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="bg-white px-3 text-gray-400 font-bold tracking-widest uppercase">{t("or_continue")}</span>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const digits = (phoneForm.watch("phone") || "").replace(/\D/g, "");
                                        const startParam = digits.length === 12 ? `reset_password_${digits}` : "reset_password";
                                        window.open(`https://t.me/Hadaf_supportbot?start=${startParam}`, "_blank");
                                    }}
                                    className="w-full h-14 rounded-2xl border-2 border-blue-50 hover:bg-blue-50 hover:border-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center gap-3 transition-all"
                                >
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                        <path d="M21.1 4.3L18.7 16.9C18.4 18.2 17.6 18.6 16.6 18.1L11 13.9L8.3 16.5C8 8 7.8 17 7.2 17L7.6 11.4L17.8 2.2C18.2 1.8 17.7 1.6 17.1 2L4.5 9.9L-0.9 8.2C-1.3 8.1 -1.3 7.4 -0.8 7.2L20.2 -0.9C21.2 -1.3 22 0.3 21.1 4.3Z" fill="currentColor" />
                                    </svg>
                                    {t("telegram_reset")}
                                </Button>
                            </motion.form>
                        )}

                        {step === "RESET" && (
                            <motion.form
                                key="reset-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={resetForm.handleSubmit(onResetSubmit)}
                                className="space-y-5"
                            >
                                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Phone size={18} className="text-blue-600" />
                                        <span className="font-bold text-slate-700">{phone}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setStep("PHONE"); resetForm.reset(); }}
                                        className="text-xs font-black uppercase text-blue-600 hover:underline"
                                    >
                                        {t("change_number")}
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">{t("sms_code")}</Label>
                                    <Input
                                        placeholder="123456"
                                        maxLength={6}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        {...resetForm.register("otp", {
                                            onChange: (e) => {
                                                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                                                e.target.value = v;
                                                resetForm.setValue("otp", v, { shouldValidate: true });
                                            },
                                        })}
                                        className="h-14 bg-gray-50/50 border-gray-200 rounded-2xl text-lg text-center tracking-[8px] font-mono"
                                        required
                                    />
                                    {resetForm.formState.errors.otp && (
                                        <p className="text-red-500 text-xs ml-1">{t("code_incomplete")}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">{t("new_password")}</Label>
                                    <Input
                                        type="password"
                                        placeholder="******"
                                        {...resetForm.register("password")}
                                        className="h-14 bg-gray-50/50 border-gray-200 rounded-2xl text-lg"
                                        required
                                    />
                                    {resetForm.formState.errors.password && (
                                        <p className="text-red-500 text-xs ml-1">{t("password_short")}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">{t("confirm_password")}</Label>
                                    <Input
                                        type="password"
                                        placeholder="******"
                                        {...resetForm.register("confirmPassword")}
                                        className="h-14 bg-gray-50/50 border-gray-200 rounded-2xl text-lg"
                                        required
                                    />
                                    {resetForm.formState.errors.confirmPassword && (
                                        <p className="text-red-500 text-xs ml-1">{t("password_mismatch")}</p>
                                    )}
                                </div>

                                {timeLeft > 0 ? (
                                    <div className="text-center text-xs font-bold text-gray-400">
                                        {t("resend_in")} <span className="text-blue-600 ml-1">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
                                    </div>
                                ) : (
                                    <button type="button" onClick={handleResend} className="w-full text-center text-xs font-black text-blue-600 hover:underline uppercase">
                                        {t("resend")}
                                    </button>
                                )}

                                <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-lg">
                                    {isLoading ? <Loader2 className="animate-spin" /> : t("reset_save")}
                                </Button>
                            </motion.form>
                        )}

                        {step === "SUCCESS" && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4"
                            >
                                <p className="text-gray-600 mb-6">{t("reset_success_desc")}</p>
                                <Link href="/?auth=login" className="w-full">
                                    <Button variant="outline" className="w-full h-12 rounded-xl">
                                        {t("login_title")}
                                    </Button>
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>

                <CardFooter className="py-6 bg-gray-50/50 border-t border-gray-100 flex justify-center">
                    <Link href="/?auth=login" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-bold transition-all group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        {t("back_to_login")}
                    </Link>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
