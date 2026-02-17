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
        <div className="max-w-3xl mx-auto py-4 md:py-8 px-4">
            <div className="flex items-center justify-between mb-4 md:mb-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="min-w-0">
                    <h1 className="text-base md:text-2xl font-black text-gray-900 leading-tight">{t('title')}</h1>
                    <p className="text-[11px] md:text-sm text-text-muted mt-0.5 line-clamp-1">{t('subtitle')}</p>
                </div>
                {notifications.some(n => !n.isRead) && (
                    <button
                        onClick={markAllRead}
                        className="shrink-0 text-[10px] md:text-sm font-black text-blue-600 bg-blue-50 px-2.5 py-1.5 md:px-3 md:py-2 rounded-full transition-all active:scale-95 border border-blue-100/50"
                    >
                        {t('mark_all_read').toUpperCase()}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="space-y-2.5 md:space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 md:h-24 bg-gray-50 rounded-2xl animate-pulse border border-gray-100"></div>
                    ))}
                </div>
            ) : notifications.length > 0 ? (
                <div className="space-y-2.5 md:space-y-4">
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
                            <div key={notif.id} className={`group p-3 md:p-5 rounded-2xl border transition-all ${notif.isRead ? 'bg-white border-gray-100 shadow-sm' : 'bg-blue-50/40 border-blue-100 shadow-md shadow-blue-900/5'}`}>
                                <div className="flex gap-3 md:gap-4">
                                    <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-active:scale-95 ${notif.isRead ? 'bg-slate-50 text-slate-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'}`}>
                                        <Bell size={16} className="md:w-5 md:h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5 md:mb-1">
                                            <h3 className={`font-bold text-[13px] md:text-base leading-tight ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{localized.title}</h3>
                                            <span className="text-[9px] md:text-xs font-bold text-slate-400 whitespace-nowrap ml-2 opacity-60 uppercase tracking-tighter">{new Date(notif.createdAt).toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US')}</span>
                                        </div>
                                        <p className={`text-[11px] md:text-sm leading-relaxed line-clamp-2 md:line-clamp-none ${notif.isRead ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>{localized.message}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 md:py-20 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                        <Bell size={28} className="md:w-8 md:h-8" />
                    </div>
                    <h3 className="text-sm md:text-lg font-black text-gray-900">{t('empty_title')}</h3>
                    <p className="text-[11px] md:text-sm text-gray-500 mt-1 max-w-[160px] md:max-w-none mx-auto opacity-70">{t('empty_desc')}</p>
                </div>
            )}
        </div>
    );
}
