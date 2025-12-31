"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "next-auth/react";
import { Save, Camera, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PhoneInput } from "@/components/ui/phone-input";

export default function PersonalInfoPage() {
    const t = useTranslations('Profile');
    const { data: session, update } = useSession();
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    const profileSchema = z.object({
        name: z.string().min(2, t('name') + " 2+ chars"),
        email: z.string().email(t('email') + " invalid"),
        phone: z.string().min(9, t('phone') + " invalid"),
        dateOfBirth: z.string().optional().or(z.literal("")),
        gender: z.string().optional().or(z.literal("")),
    });

    type ProfileForm = z.infer<typeof profileSchema>;

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            dateOfBirth: "",
            gender: "",
        },
    });

    useEffect(() => {
        // Fetch latest user data from API to ensure we have dateOfBirth/gender
        // as they might not be in the session token yet
        const fetchUserData = async () => {
            if (session?.user?.email) {
                try {
                    const res = await fetch('/api/user/info');
                    if (res.ok) {
                        const userData = await res.json();
                        setValue("name", userData.name || session.user.name || "");
                        setValue("email", userData.email || session.user.email || "");
                        setValue("phone", userData.phone || (session.user as any).phone || "");

                        // Date format for input type="date" is YYYY-MM-DD
                        if (userData.dateOfBirth) {
                            const date = new Date(userData.dateOfBirth);
                            setValue("dateOfBirth", date.toISOString().split('T')[0]);
                        }
                        setValue("gender", userData.gender || "");
                    }
                } catch (e) {
                    console.error("Failed to fetch user data", e);
                }
            }
        };

        fetchUserData();
    }, [session, setValue]);

    const onSubmit = async (data: ProfileForm) => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/user/info", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.text();
                toast.error(err || "Failed to update profile");
                return;
            }

            // Update session
            await update({
                ...session,
                user: {
                    ...session?.user,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                },
            });

            toast.success(t('success_update'));
            router.refresh(); // Refresh server components
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">{t('personal_info')}</h1>
                    <p className="text-text-muted mt-1 dark:text-gray-400">{t('personal_dashboard')}</p>
                </div>
                <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-white shadow-sm overflow-hidden relative dark:bg-gray-700 dark:border-gray-600">
                        {session?.user?.image ? (
                            <Image src={session.user.image} alt="Avatar" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary bg-primary/10">
                                <span className="text-2xl font-bold">{session?.user?.name?.[0] || "U"}</span>
                            </div>
                        )}
                    </div>
                    <button className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={14} />
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">F.I.O</label>
                        <input
                            {...register("name")}
                            className={`w-full h-12 px-4 rounded-xl border transition-all outline-none dark:bg-gray-700 dark:text-white ${errors.name ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 dark:border-gray-600"
                                }`}
                            placeholder="John Doe"
                        />
                        {errors.name && <p className="text-red-500 text-xs font-medium">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('email')}</label>
                        <input
                            {...register("email")}
                            className={`w-full h-12 px-4 rounded-xl border transition-all outline-none dark:bg-gray-700 dark:text-white ${errors.email ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 dark:border-gray-600"
                                }`}
                            placeholder="john@example.com"
                        />
                        {errors.email && <p className="text-red-500 text-xs font-medium">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('phone')}</label>
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field }) => (
                                <PhoneInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    className={`w-full h-12 px-4 rounded-xl border transition-all outline-none dark:bg-gray-700 dark:text-white ${errors.phone ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 dark:border-gray-600"
                                        }`}
                                    placeholder="+998 (90) 123-45-67"
                                />
                            )}
                        />
                        {errors.phone && <p className="text-red-500 text-xs font-medium">{errors.phone.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('date_of_birth')}</label>
                        <input
                            type="date"
                            {...register("dateOfBirth")}
                            className={`w-full h-12 px-4 rounded-xl border transition-all outline-none dark:bg-gray-700 dark:text-white ${errors.dateOfBirth ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 dark:border-gray-600"
                                }`}
                        />
                        {errors.dateOfBirth && <p className="text-red-500 text-xs font-medium">{errors.dateOfBirth.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('gender')}</label>
                        <select
                            {...register("gender")}
                            className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none transition-all cursor-pointer"
                        >
                            <option value="">{t('select_gender')}</option>
                            <option value="male">{t('male')}</option>
                            <option value="female">{t('female')}</option>
                        </select>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-primary text-white h-12 px-8 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        <span>{t('save')}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
