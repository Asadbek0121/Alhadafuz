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
        <div className="space-y-3.5 md:space-y-6 max-w-2xl mx-auto pb-10">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-50/50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100/50">
                        <Globe size={18} className="md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base md:text-2xl font-black text-gray-900 leading-tight">{tProfile('settings')}</h1>
                        <p className="text-[11px] md:text-sm text-text-muted mt-0.5 line-clamp-1">{tProfile('settings_desc')}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                            <Globe size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] md:text-base font-bold text-gray-900 leading-tight">{tProfile('change_language')}</p>
                            <p className="text-[10px] md:text-sm text-text-muted mt-0.5 truncate">{tProfile('choose_language')}</p>
                        </div>
                    </div>
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="bg-blue-50/50 border border-blue-100 text-blue-600 rounded-xl px-3 h-8 md:h-10 text-[11px] md:text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer appearance-none min-w-[100px] text-center uppercase tracking-tighter"
                    >
                        <option value="uz">{tProfile('uz')}</option>
                        <option value="ru">{tProfile('ru')}</option>
                        <option value="en">{tProfile('en')}</option>
                    </select>
                </div>

                <div className="border-t border-gray-50" />

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                            <Bell size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] md:text-base font-bold text-gray-900 leading-tight">{tProfile('notifications')}</p>
                            <p className="text-[10px] md:text-sm text-text-muted mt-0.5 truncate">{tProfile('notif_desc')}</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                            type="checkbox"
                            checked={notifications}
                            onChange={() => setNotifications(!notifications)}
                            className="sr-only peer"
                        />
                        <div className="w-10 h-5 md:w-11 md:h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 md:after:h-5 md:after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                </div>

                <div className="pt-2 md:pt-4 border-t border-gray-50 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="w-full md:w-auto bg-blue-600 text-white h-10 md:h-12 px-8 rounded-xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98] text-[13px] md:text-base"
                    >
                        {tProfile('save').toUpperCase()}
                    </button>
                </div>
            </div>
        </div>
    );
}
