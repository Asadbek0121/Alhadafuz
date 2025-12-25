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
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(9),
    password: z.string().min(6),
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
                toast.error(data.message || tAuth('system_error'));
                return;
            }

            toast.success(tAuth('welcome') + ` ${values.name}!`);

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
            toast.error(tAuth('system_error'));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md"
        >
            <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">{tAuth('register')}</CardTitle>
                    <CardDescription>
                        {tAuth('register_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{tAuth('name')}</Label>
                            <Input
                                id="name"
                                placeholder="Ism Familiya"
                                type="text"
                                icon={<User size={18} />}
                                disabled={isLoading}
                                {...form.register("name")}
                                className={form.formState.errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">{tAuth('email')}</Label>
                            <Input
                                id="email"
                                placeholder="nom@example.com"
                                type="email"
                                icon={<Mail size={18} />}
                                disabled={isLoading}
                                {...form.register("email")}
                                className={form.formState.errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">{tAuth('phone_label')}</Label>
                            <Input
                                id="phone"
                                placeholder="+998 90 123 45 67"
                                type="tel"
                                icon={<Phone size={18} />}
                                disabled={isLoading}
                                {...form.register("phone")}
                                className={form.formState.errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">{tAuth('password')}</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    placeholder="********"
                                    type={showPassword ? "text" : "password"}
                                    icon={<Lock size={18} />}
                                    disabled={isLoading}
                                    {...form.register("password")}
                                    className={form.formState.errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {tAuth('register_loading')}
                                </>
                            ) : (
                                <>
                                    {tAuth('register_btn')} <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 border-t p-6 bg-muted/20">
                    <div className="text-center text-sm text-muted-foreground">
                        {tAuth('have_account')}{" "}
                        <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                            {tAuth('login_title')}
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
