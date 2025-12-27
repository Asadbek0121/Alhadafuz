"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "@/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
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
    email: z.string().email({ message: "Email formati noto'g'ri" }),
});

export default function ForgotPasswordPage() {
    const tAuth = useTranslations('Auth');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                setIsSubmitted(true);
                toast.success("Parolni tiklash havolasi yuborildi!");
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

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[440px] px-4"
        >
            <Card className="border shadow-2xl rounded-3xl overflow-hidden bg-white/80 backdrop-blur-lg">
                <CardHeader className="text-center pt-10 pb-6">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                        <Mail size={32} />
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight text-gray-900 mb-2">
                        Parolni tiklash
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-base px-6">
                        {isSubmitted
                            ? "Biz sizning emailingizga ko'rsatmalar yubordik. Iltimos, pochtangizni tekshiring."
                            : "Ro'yxatdan o'tgan emailingizni kiriting va biz sizga parolni tiklash havolasini yuboramiz."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 px-8">
                    {!isSubmitted ? (
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-bold text-gray-700 ml-1">
                                    Elektron pochta
                                </Label>
                                <Input
                                    id="email"
                                    placeholder="nom@example.com"
                                    type="email"
                                    icon={<Mail size={20} className="text-gray-400" />}
                                    disabled={isLoading}
                                    {...form.register("email")}
                                    className={`h-14 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all text-lg rounded-2xl ${form.formState.errors.email ? "border-red-500 focus:border-red-500 bg-red-50" : ""}`}
                                />
                                {form.formState.errors.email && (
                                    <p className="text-xs text-red-500 ml-1 font-medium italic">{form.formState.errors.email.message}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl text-lg shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        Yuborish <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-gray-600 mb-6">Email kelmadimi? Spam papkasini tekshirib ko'ring yoki qaytadan urinib ko'ring.</p>
                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-xl"
                                onClick={() => setIsSubmitted(false)}
                            >
                                Qaytadan urinish
                            </Button>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="py-8 bg-gray-50/50 border-t border-gray-100 flex flex-col items-center gap-4">
                    <Link
                        href="/auth/login"
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-bold transition-all group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Kirish sahifasiga qaytish
                    </Link>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
