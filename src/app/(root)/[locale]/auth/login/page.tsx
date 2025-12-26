"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter, Link } from "@/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useTranslations } from 'next-intl';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/store/useCartStore";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";

const formSchema = z.object({
    email: z.string().email({ message: "Email formati noto'g'ri" }),
    password: z.string().min(6, { message: "Kamida 6 ta belgi" }),
});

export default function LoginPage() {
    const router = useRouter();
    const tAuth = useTranslations('Auth');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { items, setItems } = useCartStore();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Email yoki parol noto'g'ri");
            } else {
                toast.success("Xush kelibsiz!");

                // Sync Cart
                if (items.length > 0) {
                    try {
                        const res = await fetch("/api/cart/sync", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                items: items.map(i => ({ id: i.id, quantity: i.quantity }))
                            }),
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.items) {
                                setItems(data.items);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to sync cart", e);
                    }
                }

                const params = new URLSearchParams(window.location.search);
                const callbackUrl = params.get("callbackUrl") || "/";
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (error) {
            toast.error("Tizim xatosi yuz berdi");
        } finally {
            setIsLoading(false);
        }
    }

    const handleSocialLogin = (provider: string) => {
        toast.info(`${provider} orqali kirish tez orada qo'shiladi`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[440px]"
        >
            <Card className="border shadow-xl rounded-2xl overflow-hidden bg-white">
                <CardHeader className="text-center pt-8 pb-6">
                    <CardTitle className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                        Tizimga kirish
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-base">
                        Email va parolingizni kiriting
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-8">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold text-gray-700 ml-1">
                                Elektron pochta
                            </Label>
                            <Input
                                id="email"
                                placeholder="nom@example.com"
                                type="email"
                                icon={<Mail size={20} className="text-gray-400" />}
                                disabled={isLoading}
                                {...form.register("email")}
                                className={`h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all text-base rounded-xl ${form.formState.errors.email ? "border-red-500 focus:border-red-500 bg-red-50" : ""
                                    }`}
                            />
                            {form.formState.errors.email && (
                                <p className="text-xs text-red-500 ml-1 font-medium">{form.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                                    Parol
                                </Label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
                                >
                                    Parolni unutdingizmi?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    placeholder="********"
                                    type={showPassword ? "text" : "password"}
                                    icon={<Lock size={20} className="text-gray-400" />}
                                    disabled={isLoading}
                                    {...form.register("password")}
                                    className={`h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all text-base rounded-xl pr-12 ${form.formState.errors.password ? "border-red-500 focus:border-red-500 bg-red-50" : ""
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {form.formState.errors.password && (
                                <p className="text-xs text-red-500 ml-1 font-medium">{form.formState.errors.password.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-base shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Kirish <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-4 text-gray-400 font-medium tracking-wider">
                                Yoki davom eting
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => handleSocialLogin("Google")}
                            disabled={isLoading}
                            className="h-12 bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSocialLogin("Telegram")}
                            disabled={isLoading}
                            className="h-12 bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.1 4.3l-2.4 12.6c-.3 1.3-1.1 1.7-2.1 1.2l-5.6-4.2-2.7 2.6c-.3.3-.5.5-1 .5l.4-5.6 10.2-9.2c.4-.4-.1-.6-.7-.2l-12.6 7.9-5.4-1.7c-1.2-.4-1.2-1.1.2-1.7l21-8.1c1-.4 1.9 0 1.6.9z" fill="#0088cc" stroke="none" />
                            </svg>
                            Telegram
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="py-6 bg-white border-t border-gray-100">
                    <div className="w-full text-center">
                        <span className="text-gray-500 font-medium">Hisobingiz yo'qmi? </span>
                        <Link href="/auth/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all">
                            Ro'yxatdan o'tish
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
