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
        name: z.string().min(2, t('name_min')),
        username: z.string().min(3, t('username_invalid')).optional().or(z.literal("")),
        email: z.string().email(t('email_invalid')).optional().or(z.literal("")),
        phone: z.string().min(9, t('phone_invalid')),
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
            username: "",
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
            if (session?.user?.id) {
                try {
                    const res = await fetch('/api/user/info');
                    if (res.ok) {
                        const userData = await res.json();
                        if (userData) {
                            setValue("name", userData.name || session?.user?.name || "");
                            setValue("username", userData.username || "");
                            setValue("email", userData.email || session?.user?.email || "");
                            setValue("phone", userData.phone || (session?.user as any)?.phone || "");

                            // Date format for input type="date" is YYYY-MM-DD
                            if (userData.dateOfBirth) {
                                const date = new Date(userData.dateOfBirth);
                                setValue("dateOfBirth", date.toISOString().split('T')[0]);
                            }
                            setValue("gender", userData.gender || "");
                        } else {
                            // Fallback to session data if DB user not found
                            setValue("name", session?.user?.name || "");
                            setValue("email", session?.user?.email || "");
                            setValue("phone", (session?.user as any)?.phone || "");
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch user data", e);
                }
            }
        };

        fetchUserData();
    }, [session?.user?.id, setValue]);

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
            toast.error(t('save_fail'));
        } finally {
            setIsSaving(false);
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('image_too_large') || "Rasm hajmi juda katta (max 5MB)");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Yuklashda xatolik");

            const { url } = await res.json();

            // Store image in user profile
            const updateRes = await fetch("/api/user/info", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: session?.user?.name || "",
                    image: url
                }),
            });

            if (updateRes.ok) {
                await update({ ...session, user: { ...session?.user, image: url } });
                toast.success(t('image_updated') || "Rasm yangilandi!");
                router.refresh();
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(t('upload_fail') || "Yuklashda xatolik yuz berdi");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('personal_info')}</h1>
                    <p className="text-text-muted mt-1">{t('personal_dashboard')}</p>
                </div>
                <div className="relative group">
                    <input
                        type="file"
                        id="avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                    />
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-white shadow-sm overflow-hidden relative">
                        {isUploading ? (
                            <div className="absolute inset-0 z-10 bg-black/20 flex items-center justify-center">
                                <Loader2 size={24} className="animate-spin text-white" />
                            </div>
                        ) : null}
                        {session?.user?.image ? (
                            <Image src={session.user.image} alt="Avatar" width={80} height={80} className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary bg-primary/10">
                                <span className="text-2xl font-bold">{session?.user?.name?.[0] || "U"}</span>
                            </div>
                        )}
                    </div>
                    <label
                        htmlFor="avatar-upload"
                        className={`absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-lg cursor-pointer hover:bg-primary-hover transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <Camera size={14} />
                    </label>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">{t('fio')}</label>
                        <input
                            {...register("name")}
                            className={`w-full h-12 px-4 rounded-xl border transition-all outline-none ${errors.name ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                                }`}
                            placeholder={t('fio')}
                        />
                        {errors.name && <p className="text-red-500 text-xs font-medium">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">{t('username')}</label>
                        <input
                            {...register("username")}
                            className={`w-full h-12 px-4 rounded-xl border transition-all outline-none ${errors.username ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                                }`}
                            placeholder={t('username')}
                        />
                        {errors.username && <p className="text-red-500 text-xs font-medium">{errors.username.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">{t('email')}</label>
                        <input
                            {...register("email")}
                            className={`w-full h-12 px-4 rounded-xl border transition-all outline-none ${errors.email ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                                }`}
                            placeholder={t('email')}
                        />
                        {errors.email && <p className="text-red-500 text-xs font-medium">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">{t('phone')}</label>
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field }) => (
                                <PhoneInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    className={`w-full h-12 px-4 rounded-xl border transition-all outline-none ${errors.phone ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                                        }`}
                                    placeholder="+998 (90) 123-45-67"
                                />
                            )}
                        />
                        {errors.phone && <p className="text-red-500 text-xs font-medium">{errors.phone.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">{t('date_of_birth')}</label>
                        <input
                            type="date"
                            {...register("dateOfBirth")}
                            className={`w-full h-12 px-4 rounded-xl border transition-all outline-none ${errors.dateOfBirth ? "border-red-500 bg-red-50/10" : "border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                                }`}
                        />
                        {errors.dateOfBirth && <p className="text-red-500 text-xs font-medium">{errors.dateOfBirth.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">{t('gender')}</label>
                        <select
                            {...register("gender")}
                            className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all cursor-pointer"
                        >
                            <option value="">{t('select_gender')}</option>
                            <option value="male">{t('male')}</option>
                            <option value="female">{t('female')}</option>
                        </select>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
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
