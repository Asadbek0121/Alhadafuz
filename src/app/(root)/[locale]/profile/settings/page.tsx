"use client";

import { Bell, Globe, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/navigation";
import { useLocale } from "next-intl";
import { useUserStore } from "@/store/useUserStore";

export default function SettingsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();
    const { user, setUser } = useUserStore();

    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [language, setLanguage] = useState(currentLocale);

    // Load initial settings from user if available
    useEffect(() => {
        if (user) {
            // Check if properties exist on user object (need to update store type to include them properly or cast)
            const u = user as any;
            if (typeof u.notificationsEnabled !== 'undefined') setNotifications(u.notificationsEnabled);
            if (typeof u.isDarkMode !== 'undefined') setDarkMode(u.isDarkMode);
        }
        setLanguage(currentLocale);
    }, [user, currentLocale]);

    // Handle Dark Mode Effect
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

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
                    isDarkMode: darkMode
                })
            });

            if (res.ok) {
                const updatedUser = await res.json();
                setUser({ ...user, ...updatedUser });
                toast.success("Sozlamalar saqlandi");
            } else {
                toast.error("Xatolik yuz berdi");
            }
        } catch (err) {
            toast.error("Saqlashda xatolik");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold">Sozlamalar</h1>
                <p className="text-text-muted mt-1">Ilova sozlamalarini boshqaring.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-6">
                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Globe size={20} />
                        </div>
                        <div>
                            <p className="font-semibold">Tilni o'zgartirish</p>
                            <p className="text-sm text-text-muted">Ilova tilini tanlang</p>
                        </div>
                    </div>
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="uz">O'zbekcha</option>
                        <option value="ru">Русский</option>
                        <option value="en">English</option>
                    </select>
                </div>

                <div className="border-t border-gray-100" />

                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                            <Bell size={20} />
                        </div>
                        <div>
                            <p className="font-semibold">Bildirishnomalar</p>
                            <p className="text-sm text-text-muted">Yangiliklar va aksiyalar haqida xabar olish</p>
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

                <div className="border-t border-gray-100" />

                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <Moon size={20} />
                        </div>
                        <div>
                            <p className="font-semibold">Tungi rejim</p>
                            <p className="text-sm text-text-muted">Ilova ko'rinishini o'zgartirish</p>
                        </div>
                    </div>
                    {/* Dark Mode Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={darkMode}
                            onChange={() => setDarkMode(!darkMode)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                <div className="pt-4">
                    <button
                        onClick={handleSave}
                        className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
                    >
                        Saqlash
                    </button>
                </div>
            </div>
        </div>
    );
}
