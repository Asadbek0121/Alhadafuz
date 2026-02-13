"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "@/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, ArrowRight, ArrowLeft, KeyRound, Lock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";

// Schemas
const emailSchema = z.object({
    email: z.string().email({ message: "Email formati noto'g'ri" }),
});

const otpSchema = z.object({
    otp: z.string().length(6, { message: "Kod 6 ta raqamdan iborat bo'lishi kerak" }),
});

const passwordSchema = z.object({
    password: z.string().min(6, { message: "Parol kamida 6 ta belgi bo'lishi kerak" }),
    confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Parollar mos kelmadi",
    path: ["confirmPassword"],
});

type Step = "EMAIL" | "OTP" | "PASSWORD" | "SUCCESS";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("EMAIL");
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");

    // Forms
    const emailForm = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });
    const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema) });
    const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

    // Step 1: Send OTP
    async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                setEmail(values.email);
                setStep("OTP");
                toast.success("Tasdiqlash kodi emailingizga yuborildi");
            } else {
                toast.error("Xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Tizim xatosi");
        } finally {
            setIsLoading(false);
        }
    }

    // Step 2: Verify OTP (Client side validation mostly, but server checks ultimately)
    // Actually we will carry the token to the next step or just verify it here 
    // Wait, verificationToken table needs to be checked.
    // Let's make a verify endpoint or just move to next step and send OTP with password?
    // User experience is better if we verify OTP before asking for password.
    // We will assume OTP is correct if user proceeds? No, better to verify.
    // Let's add a verify-otp generic endpoint or just use logic. 
    // For now, let's just move to password step and send everything together? 
    // Or we can add a check. Let's send everything at the end to `reset-password`.
    // BUT `reset-password` API expects token (OTP), email, and password. 
    // So we can technically collect them.

    async function onOtpSubmit(values: z.infer<typeof otpSchema>) {
        // Optional: Verify OTP existence via dry-run if we wanted, but let's just move to next step
        // to keep it simple. If OTP is wrong, final step will fail.
        setOtp(values.otp);
        setStep("PASSWORD");
    }

    // Step 3: Reset Password
    async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    token: otp, // Sending OTP as token
                    password: values.password
                }),
            });

            if (res.ok) {
                toast.success("Parol muvaffaqiyatli o'zgartirildi!");
                window.location.href = "/?resetSuccess=true";
            } else {
                const data = await res.json();
                toast.error(data.message || "Kod noto'g'ri yoki muddati tugagan");
                if (data.message?.includes("Kod")) {
                    setStep("OTP"); // Go back to OTP if wrong
                }
            }
        } catch (error) {
            toast.error("Tizim xatosi");
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
                        {step === "EMAIL" && <Mail size={32} />}
                        {step === "OTP" && <KeyRound size={32} />}
                        {step === "PASSWORD" && <Lock size={32} />}
                        {step === "SUCCESS" && <CheckCircle2 size={32} className="text-green-600" />}
                    </div>

                    <CardTitle className="text-2xl font-black tracking-tight text-gray-900 mb-2">
                        {step === "EMAIL" && "Parolni tiklash"}
                        {step === "OTP" && "Tasdiqlash kodi"}
                        {step === "PASSWORD" && "Yangi parol"}
                        {step === "SUCCESS" && "Muvaffaqiyatli!"}
                    </CardTitle>

                    <CardDescription className="text-gray-500 text-base px-6">
                        {step === "EMAIL" && "Ro'yxatdan o'tgan emailingizni kiriting"}
                        {step === "OTP" && `Biz ${email} manziliga kod yubordik`}
                        {step === "PASSWORD" && "Yangi xavfsiz parol o'rnating"}
                        {step === "SUCCESS" && "Sizning parolingiz yangilandi"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 px-8 pb-8">
                    <AnimatePresence mode="wait">
                        {step === "EMAIL" && (
                            <motion.form
                                key="email-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                                className="space-y-5"
                            >
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">Email</Label>
                                    <Input
                                        placeholder="nom@example.com"
                                        type="email"
                                        {...emailForm.register("email")}
                                        className="h-14 bg-gray-50/50 border-gray-200 rounded-2xl text-lg"
                                    />
                                    {emailForm.formState.errors.email && (
                                        <p className="text-red-500 text-xs ml-1">{emailForm.formState.errors.email.message}</p>
                                    )}
                                </div>
                                <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-lg">
                                    {isLoading ? <Loader2 className="animate-spin" /> : "Kod olish"}
                                </Button>

                                <div className="relative py-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-100"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="bg-white px-3 text-gray-400 font-bold tracking-widest uppercase">Yoki</span>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.open('https://t.me/Hadaf_supportbot?start=reset_password', '_blank')}
                                    className="w-full h-14 rounded-2xl border-2 border-blue-50 hover:bg-blue-50 hover:border-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center gap-3 transition-all"
                                >
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                        <path d="M21.1 4.3L18.7 16.9C18.4 18.2 17.6 18.6 16.6 18.1L11 13.9L8.3 16.5C8 16.8 7.8 17 7.2 17L7.6 11.4L17.8 2.2C18.2 1.8 17.7 1.6 17.1 2L4.5 9.9L-0.9 8.2C-1.3 8.1 -1.3 7.4 -0.8 7.2L20.2 -0.9C21.2 -1.3 22 0.3 21.1 4.3Z" fill="currentColor" />
                                    </svg>
                                    Telegram orqali tiklash
                                </Button>
                            </motion.form>
                        )}

                        {step === "OTP" && (
                            <motion.form
                                key="otp-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={otpForm.handleSubmit(onOtpSubmit)}
                                className="space-y-5"
                            >
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">6 xonali kod</Label>
                                    <Input
                                        placeholder="123456"
                                        maxLength={6}
                                        {...otpForm.register("otp")}
                                        className="h-14 bg-gray-50/50 border-gray-200 rounded-2xl text-lg text-center tracking-[8px] font-mono"
                                    />
                                    {otpForm.formState.errors.otp && (
                                        <p className="text-red-500 text-xs ml-1">{otpForm.formState.errors.otp.message}</p>
                                    )}
                                </div>
                                <div className="text-center text-sm text-gray-500">
                                    <button type="button" onClick={() => setStep("EMAIL")} className="text-blue-600 hover:underline">
                                        Emailni o'zgartirish
                                    </button>
                                </div>
                                <Button type="submit" className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-lg">
                                    Davom etish
                                </Button>
                            </motion.form>
                        )}

                        {step === "PASSWORD" && (
                            <motion.form
                                key="password-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                                className="space-y-5"
                            >
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">Yangi parol</Label>
                                    <Input
                                        type="password"
                                        placeholder="******"
                                        {...passwordForm.register("password")}
                                        className="h-14 bg-gray-50/50 border-gray-200 rounded-2xl text-lg"
                                    />
                                    {passwordForm.formState.errors.password && (
                                        <p className="text-red-500 text-xs ml-1">{passwordForm.formState.errors.password.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">Parolni tasdiqlang</Label>
                                    <Input
                                        type="password"
                                        placeholder="******"
                                        {...passwordForm.register("confirmPassword")}
                                        className="h-14 bg-gray-50/50 border-gray-200 rounded-2xl text-lg"
                                    />
                                    {passwordForm.formState.errors.confirmPassword && (
                                        <p className="text-red-500 text-xs ml-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                                    )}
                                </div>
                                <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-lg">
                                    {isLoading ? <Loader2 className="animate-spin" /> : "Saqlash"}
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
                                <p className="text-gray-600 mb-6">Parol muvaffaqiyatli o'zgartirildi. Siz kirish sahifasiga yo'naltirilasiz.</p>
                                <Button onClick={() => window.location.href = "/auth/login"} variant="outline" className="w-full h-12 rounded-xl">
                                    Kirish
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>

                <CardFooter className="py-6 bg-gray-50/50 border-t border-gray-100 flex justify-center">
                    <Link href="/?auth=login" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-bold transition-all group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Kirishga qaytish
                    </Link>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
