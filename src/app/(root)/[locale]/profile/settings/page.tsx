"use client";

import { Bell, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useUserStore } from "@/store/useUserStore";

export default function SettingsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();
    const { user, updateUser } = useUserStore();
    const tProfile = useTranslations('Profile');

    const [notifications, setNotifications] = useState(true);

    const [language, setLanguage] = useState(currentLocale);

    // Load initial settings from user if available
    useEffect(() => {
        if (user) {
            // Check if properties exist on user object (need to update store type to include them properly or cast)
            const u = user as any;
            if (typeof u.notificationsEnabled !== 'undefined') setNotifications(u.notificationsEnabled);
        }
        setLanguage(currentLocale);
    }, [user, currentLocale]);



    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        router.replace(pathname, { locale: newLang });
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/user/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notificationsEnabled: notifications,
                })
            });

            if (res.ok) {
                const updatedUser = await res.json();
                updateUser(updatedUser);
                toast.success(tProfile('save_success'));
            } else {
                toast.error(tProfile('save_error'));
            }
        } catch (err) {
            toast.error(tProfile('save_fail'));
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold">{tProfile('settings')}</h1>
                <p className="text-text-muted mt-1">{tProfile('settings_desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-6">
                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Globe size={20} />
                        </div>
                        <div>
                            <p className="font-semibold">{tProfile('change_language')}</p>
                            <p className="text-sm text-text-muted">{tProfile('choose_language')}</p>
                        </div>
                    </div>
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="uz">{tProfile('uz')}</option>
                        <option value="ru">{tProfile('ru')}</option>
                        <option value="en">{tProfile('en')}</option>
                    </select>
                </div>

                <div className="border-t border-gray-100" />

                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                            <Bell size={20} />
                        </div>
                        <div>
                            <p className="font-semibold">{tProfile('notifications')}</p>
                            <p className="text-sm text-text-muted">{tProfile('notif_desc')}</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notifications}
                            onChange={() => setNotifications(!notifications)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>



                <div className="pt-4">
                    <button
                        onClick={handleSave}
                        className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
                    >
                        {tProfile('save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
