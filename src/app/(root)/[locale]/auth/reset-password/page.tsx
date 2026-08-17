"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

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
    password: z.string().min(6, { message: "short" }),
    confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
    message: "mismatch",
    path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
    const t = useTranslations("Auth");
    const router = useRouter();
    const searchParams = useSearchParams();
    const phone = searchParams.get("phone");
    const token = searchParams.get("token");

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        if (!token || !phone) {
            toast.error(t("invalid_link"));
            router.replace("/auth/forgot-password");
        }
    }, [token, phone, router, t]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone,
                    token,
                    password: values.password,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(t("reset_success"));
                window.location.href = "/?resetSuccess=true";
            } else {
                toast.error(data.message || t("system_error"));
            }
        } catch (error) {
            toast.error(t("system_error"));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[440px] px-4"
        >
            <Card className="border shadow-2xl rounded-3xl overflow-hidden bg-white">
                <CardHeader className="text-center pt-8 pb-4">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
                        <Lock size={28} />
                    </div>
                    <CardTitle className="text-3xl font-black text-gray-900 mb-2">
                        {t("new_password")}
                    </CardTitle>
                    <CardDescription className="text-base text-gray-500">
                        {t("reset_page_desc")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 px-8">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 ml-1">{t("new_password")}</Label>
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
                                    aria-label={showPassword ? "hide" : "show"}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {form.formState.errors.password && (
                                <p className="text-xs text-red-500 font-medium italic">{t("password_short")}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 ml-1">{t("confirm_password")}</Label>
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="********"
                                icon={<Lock size={20} className="text-gray-400" />}
                                {...form.register("confirmPassword")}
                                className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus:border-blue-500 transition-all"
                            />
                            {form.formState.errors.confirmPassword && (
                                <p className="text-xs text-red-500 font-medium italic">{t("password_mismatch")}</p>
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
                                t("reset_btn")
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="py-6 bg-gray-50/50 border-t border-gray-100 flex justify-center">
                    <Link href="/auth/forgot-password" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-all">
                        {t("forgot_title")}
                    </Link>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
