import { Mail, Phone, MapPin, MessageCircle, HelpCircle, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

async function getSettings() {
    const settings = await prisma.storeSettings.findUnique({
        where: { id: "default" }
    });

    let socialLinks: any = { telegram: '', instagram: '', facebook: '', youtube: '', supportTelegram: '' };
    if (settings?.socialLinks) {
        try { socialLinks = JSON.parse(settings.socialLinks); } catch (e) { }
    }

    const telegramLink = socialLinks.supportTelegram || socialLinks.telegram || "https://t.me/hadaf_uz";

    const contactInfo = {
        phone: settings?.phone || "+998 71 200 01 05",
        email: settings?.email || "info@hadaf.uz",
        workingHours: "24/7",
        telegramUsername: telegramLink.split('/').pop() || "@hadaf_uz"
    };

    return {
        phone: contactInfo.phone,
        email: contactInfo.email,
        telegram: telegramLink,
        address: settings?.address || "Toshkent shahri",
        telegramUsername: contactInfo.telegramUsername,
        workingHours: contactInfo.workingHours
    };
}

export default async function SupportPage() {
    const settings = await getSettings();
    const t = await getTranslations('Support');

    const contactMethods = [
        {
            icon: Phone,
            title: t('call_us'),
            desc: t('call_desc'),
            value: settings.phone,
            href: `tel:${settings.phone.replace(/\s/g, '')}`,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            icon: MessageCircle,
            title: t('telegram'),
            desc: t('telegram_desc'),
            value: settings.telegramUsername,
            href: settings.telegram,
            color: "text-green-600",
            bg: "bg-green-50"
        },
        {
            icon: Mail,
            title: t('email'),
            desc: t('email_desc'),
            value: settings.email,
            href: `mailto:${settings.email}`,
            color: "text-purple-600",
            bg: "bg-purple-50"
        }
    ];

    return (
        <div className="max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-5">
            <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">{t('title')}</h1>
                <p className="text-gray-500 text-base md:text-lg">{t('subtitle')}</p>
            </div>

            {/* Desktop View: Grid */}
            <div className="hidden md:grid grid-cols-3 gap-8 mb-16">
                {contactMethods.map((method, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center hover:shadow-md transition-shadow group">
                        <div className={`w-16 h-16 ${method.bg} ${method.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                            <method.icon size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{method.title}</h3>
                        <p className="text-gray-500 mb-4 text-sm">{method.desc}</p>
                        <a href={method.href} className={`text-lg font-bold ${method.color} hover:opacity-80`}>
                            {method.value}
                        </a>
                    </div>
                ))}
            </div>

            {/* Mobile View: Compact List */}
            <div className="md:hidden flex flex-col gap-3 mb-10">
                {contactMethods.map((method, idx) => (
                    <a key={idx} href={method.href} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all">
                        <div className={`w-12 h-12 ${method.bg} ${method.color} rounded-xl flex items-center justify-center shrink-0`}>
                            <method.icon size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{method.title}</h3>
                            <p className="text-xs text-text-muted">{method.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${method.color}`}>{method.value}</span>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                    </a>
                ))}
            </div>

            {/* Live Chat Button */}
            <div className="mb-8 md:mb-12">
                <Link
                    href="/support/chat"
                    className="block max-w-2xl mx-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <MessageCircle size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">{t('chat_title') || 'Jonli chat'}</h3>
                                <p className="text-blue-100 text-sm">{t('chat_subtitle') || 'Tezkor javoblar olish'}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
            </div>

            <div className="bg-white md:bg-gray-50 rounded-3xl p-0 md:p-12 border-t md:border-0 border-gray-100 pt-8 md:pt-0">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 text-center">{t('faq')}</h2>
                    <div className="space-y-3 md:space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <details key={i} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <summary className="flex items-center justify-between p-4 md:p-5 cursor-pointer font-medium text-gray-900 group-open:text-primary">
                                    {t(`q${i}` as any)}
                                    <span className="group-open:rotate-180 transition-transform text-gray-400">
                                        <ChevronRight size={20} className="rotate-90" />
                                    </span>
                                </summary>
                                <div className="px-4 md:px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-4 bg-gray-50/50">
                                    {t(`a${i}` as any)}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
