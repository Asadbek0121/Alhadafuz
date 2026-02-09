"use client";

import { Bell, Check, Info, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";

interface Notification {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}

export default function NotificationsPage() {
    const t = useTranslations('Notifications');
    const tProfile = useTranslations('Profile');
    const tHeader = useTranslations('Header');
    const locale = useLocale();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const markAllRead = async () => {
        try {
            const res = await fetch('/api/user/notifications', { method: 'PUT' });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                window.dispatchEvent(new Event('notifications-updated'));
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetch('/api/user/notifications')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setNotifications(data);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                    <p className="text-gray-500">{t('subtitle')}</p>
                </div>
                {notifications.some(n => !n.isRead) && (
                    <button
                        onClick={markAllRead}
                        className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                    >
                        {t('mark_all_read')}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : notifications.length > 0 ? (
                <div className="space-y-4">
                    {notifications.map((notif) => {
                        const getLocalized = (n: Notification) => {
                            let title = n.title;
                            let message = n.message;

                            // Match system notifications
                            if (title === "Buyurtma holati yangilandi") {
                                title = t('order_status_title');
                                if (message.includes('raqamli buyurtmangiz holati:')) {
                                    const idMatch = message.match(/#([A-Z0-9]+)/i);
                                    const id = idMatch ? idMatch[1].toUpperCase() : '';
                                    const statusPart = message.split(': ')[1];
                                    const uzStatuses: any = {
                                        'Buyurtmangiz qabul qilindi va kutilmoqda.': 'pending',
                                        'Buyurtmangiz tasdiqlandi va tayyorlanmoqda.': 'processing',
                                        'Buyurtmangiz yo\'lga chiqdi va tez orada yetkaziladi.': 'shipping',
                                        'Buyurtmangiz muvaffaqiyatli yetkazib berildi. Xaridingiz uchun rahmat!': 'delivered',
                                        'Buyurtmangiz bekor qilindi.': 'cancelled'
                                    };
                                    const status = uzStatuses[statusPart] ? tProfile(uzStatuses[statusPart]) : statusPart;
                                    message = t('order_status_msg', { id, status });
                                }
                            } else if (title === "Yangi Buyurtma") {
                                title = t('new_order_title');
                                if (message.includes('qabul qilindi. Summa:')) {
                                    const idMatch = message.match(/#([A-Z0-9]+)/i);
                                    const id = idMatch ? idMatch[1].toUpperCase() : '';
                                    const total = message.split('Summa: ')[1]?.replace(/so'm|сум|UZS/i, '').trim();
                                    message = t('new_order_msg', { id, total: total + ' ' + tHeader('som') });
                                }
                            } else if (title === "Yangi Foydalanuvchi") {
                                title = t('new_user_title');
                                if (message.includes("ro'yxatdan o'tdi.")) {
                                    const name = message.replace(" ro'yxatdan o'tdi.", "");
                                    message = t('new_user_msg', { name });
                                }
                            }

                            return { title, message };
                        };

                        const localized = getLocalized(notif);

                        return (
                            <div key={notif.id} className={`p-5 rounded-2xl border transition-all ${notif.isRead ? 'bg-white border-gray-100' : 'bg-blue-50/50 border-blue-100 shadow-sm'}`}>
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${notif.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                                        <Bell size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`font-semibold ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{localized.title}</h3>
                                            <span className="text-xs text-gray-400">{new Date(notif.createdAt).toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US')}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">{localized.message}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{t('empty_title')}</h3>
                    <p className="text-gray-500 mt-1">{t('empty_desc')}</p>
                </div>
            )}
        </div>
    );
}
