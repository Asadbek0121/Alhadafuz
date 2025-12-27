"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock, Loader2, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useTranslations } from 'next-intl';

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

const formSchema = z.object({
    password: z.string().min(6, { message: "Kamida 6 ta belgi bo'lishi shart" }),
    confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Parollar mos kelmadi",
    path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        if (!token || !email) {
            toast.error("Yaroqsiz havola");
            router.push("/auth/login");
        }
    }, [token, email, router]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    email,
                    password: values.password,
                }),
            });

            if (res.ok) {
                setIsSuccess(true);
                toast.success("Parol muvaffaqiyatli yangilandi!");
                setTimeout(() => {
                    router.push("/auth/login");
                }, 3000);
            } else {
                const data = await res.json();
                toast.error(data.message || "Xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Tizim xatosi yuz berdi");
        } finally {
            setIsLoading(false);
        }
    }

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[440px] px-4"
            >
                <Card className="border shadow-2xl rounded-3xl p-10 text-center bg-white">
                    <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 text-green-500">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-4">Tayyor!</h2>
                    <p className="text-gray-500 text-lg mb-8">
                        Sizning parolingiz muvaffaqiyatli o'zgartirildi. 3 soniyadan so'ng kirish sahifasiga yo'naltirilasiz...
                    </p>
                    <Link href="/auth/login" className="w-full">
                        <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700">
                            Hoziroq kirish
                        </Button>
                    </Link>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[440px] px-4"
        >
            <Card className="border shadow-2xl rounded-3xl overflow-hidden bg-white">
                <CardHeader className="text-center pt-8 pb-4">
                    <CardTitle className="text-3xl font-black text-gray-900 mb-2">
                        Yangi parol
                    </CardTitle>
                    <CardDescription className="text-base text-gray-500">
                        Iltimos, o'zingiz uchun yangi va xavfsiz parol o'rnating.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 px-8">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 ml-1">Yangi parol</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="********"
                                    icon={<Lock size={20} className="text-gray-400" />}
                                    {...form.register("password")}
                                    className="h-14 bg-gray-50 border-gray-200 rounded-2xl pr-12 focus:border-blue-500 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {form.formState.errors.password && (
                                <p className="text-xs text-red-500 font-medium italic">{form.formState.errors.password.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 ml-1">Parolni tasdiqlang</Label>
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="********"
                                icon={<Lock size={20} className="text-gray-400" />}
                                {...form.register("confirmPassword")}
                                className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus:border-blue-500 transition-all"
                            />
                            {form.formState.errors.confirmPassword && (
                                <p className="text-xs text-red-500 font-medium italic">{form.formState.errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-6 w-6" />
                            ) : (
                                "Parolni saqlash"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}
