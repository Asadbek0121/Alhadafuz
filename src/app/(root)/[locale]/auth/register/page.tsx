"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "@/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, User, Phone, ArrowRight } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslations } from 'next-intl';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const formSchema = z.object({
    name: z.string().min(2, { message: "Ism kamida 2 ta harf bo'lishi kerak" }),
    email: z.string().email({ message: "Email formati noto'g'ri" }),
    phone: z.string().min(9, { message: "Telefon raqam noto'g'ri" }),
    password: z.string().min(6, { message: "Parol kamida 6 ta belgi bo'lishi kerak" }),
});

export default function RegisterPage() {
    const router = useRouter();
    const tAuth = useTranslations('Auth');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Xatolik yuz berdi");
                return;
            }

            toast.success(`Xush kelibsiz, ${values.name}!`);

            // Auto login
            const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
            });

            if (result?.ok) {
                router.push("/");
                router.refresh();
            } else {
                router.push("/auth/login");
            }
        } catch (error) {
            toast.error("Tizim xatosi yuz berdi");
        } finally {
            setIsLoading(false);
        }
    }

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
                        Ro'yxatdan o'tish
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-base">
                        Yangi hisob yaratish uchun ma'lumotlarni kiriting
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-8">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold text-gray-700 ml-1">
                                Ismingiz
                            </Label>
                            <Input
                                id="name"
                                placeholder="Ism Familiya"
                                type="text"
                                icon={<User size={20} className="text-gray-400" />}
                                disabled={isLoading}
                                {...form.register("name")}
                                className={`h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all text-base rounded-xl ${form.formState.errors.name ? "border-red-500 focus:border-red-500 bg-red-50" : ""
                                    }`}
                            />
                            {form.formState.errors.name && (
                                <p className="text-xs text-red-500 ml-1 font-medium">{form.formState.errors.name.message}</p>
                            )}
                        </div>

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
                            <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 ml-1">
                                Telefon raqamingiz
                            </Label>
                            <Input
                                id="phone"
                                placeholder="+998 90 123 45 67"
                                type="tel"
                                icon={<Phone size={20} className="text-gray-400" />}
                                disabled={isLoading}
                                {...form.register("phone")}
                                className={`h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all text-base rounded-xl ${form.formState.errors.phone ? "border-red-500 focus:border-red-500 bg-red-50" : ""
                                    }`}
                            />
                            {form.formState.errors.phone && (
                                <p className="text-xs text-red-500 ml-1 font-medium">{form.formState.errors.phone.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold text-gray-700 ml-1">
                                Parol
                            </Label>
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
                                    Ro'yxatdan o'tish <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="py-6 bg-white border-t border-gray-100">
                    <div className="w-full text-center">
                        <span className="text-gray-500 font-medium">Allaqachon hisobingiz bormi? </span>
                        <Link href="/auth/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all">
                            Tizimga kirish
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
