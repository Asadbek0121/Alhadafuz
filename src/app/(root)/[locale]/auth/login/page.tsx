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
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const formSchema = z.object({
    email: z.string().email({ message: "Email format incorrect" }),
    password: z.string().min(6, { message: "Min 6 chars" }),
});

export default function LoginPage() {
    const router = useRouter();
    const tAuth = useTranslations('Auth');
    const tHeader = useTranslations('Header');
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
                toast.error(tAuth('login_error'));
            } else {
                toast.success(tAuth('welcome'));

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
            toast.error(tAuth('system_error'));
        } finally {
            setIsLoading(false);
        }
    }

    const handleSocialLogin = (provider: string) => {
        // Mock social login for now or implement real provider
        toast.info(`${provider} login coming soon`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md"
        >
            <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">{tAuth('login_title')}</CardTitle>
                    <CardDescription>
                        {tAuth('login_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{tAuth('email')}</Label>
                            <div className="relative">
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
                            {form.formState.errors.email && (
                                <p className="text-xs text-destructive mt-1 ml-1">{form.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">{tAuth('password')}</Label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                    {tAuth('forgot_password')}
                                </Link>
                            </div>
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
                            {form.formState.errors.password && (
                                <p className="text-xs text-destructive mt-1 ml-1">{form.formState.errors.password.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {tAuth('logging_in')}
                                </>
                            ) : (
                                <>
                                    {tHeader('kirish')} <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                {tAuth('or_continue')}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" onClick={() => handleSocialLogin("Google")} disabled={isLoading}>
                            {/* SVG Content */}
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </Button>
                        <Button variant="outline" onClick={() => handleSocialLogin("Telegram")} disabled={isLoading}>
                            {/* SVG Content */}
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.1 4.3l-2.4 12.6c-.3 1.3-1.1 1.7-2.1 1.2l-5.6-4.2-2.7 2.6c-.3.3-.5.5-1 .5l.4-5.6 10.2-9.2c.4-.4-.1-.6-.7-.2l-12.6 7.9-5.4-1.7c-1.2-.4-1.2-1.1.2-1.7l21-8.1c1-.4 1.9 0 1.6.9z" fill="#0088cc" stroke="none" />
                            </svg>
                            Telegram
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 border-t p-6 bg-muted/20">
                    <div className="text-center text-sm text-muted-foreground">
                        {tAuth('no_account')}{" "}
                        <Link href="/auth/register" className="font-semibold text-primary hover:underline">
                            {tAuth('register')}
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
