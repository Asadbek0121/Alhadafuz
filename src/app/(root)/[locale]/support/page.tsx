import { Mail, Phone, MapPin, MessageCircle, HelpCircle, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import ChatTrigger from "@/components/SupportChat/ChatTrigger";

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
        <div className="max-w-5xl mx-auto py-2 md:py-12 px-4 md:px-5">
            <div className="text-center max-w-2xl mx-auto mb-5 md:mb-16">
                <h1 className="text-lg md:text-3xl font-black text-gray-900 mb-1.5 md:mb-4">{t('title')}</h1>
                <p className="text-gray-500 text-[12px] md:text-lg leading-relaxed px-2">{t('subtitle')}</p>
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

            {/* Mobile View: Ultra Compact List */}
            <div className="md:hidden flex flex-col gap-2 mb-6">
                {contactMethods.map((method, idx) => (
                    <a key={idx} href={method.href} className="flex items-center gap-3 p-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-[0.97] transition-all group">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-active:scale-90 ${method.bg} ${method.color} border border-white/50 shadow-sm`}>
                            <method.icon size={16} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                            <h3 className="font-bold text-[12px] text-gray-900 leading-tight truncate">{method.title}</h3>
                            <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1 font-medium">{method.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[11px] font-black ${method.color} tracking-tighter`}>{method.value}</span>
                            <ChevronRight size={12} className="text-slate-200" strokeWidth={3} />
                        </div>
                    </a>
                ))}
            </div>

            {/* Live Chat Button */}
            <div className="mb-6 md:mb-12">
                <ChatTrigger
                    title={t('chat_title') || 'Jonli chat'}
                    subtitle={t('chat_subtitle') || 'Tezkor javoblar olish'}
                />
            </div>

            <div className="bg-white md:bg-gray-50 rounded-[1.75rem] p-0 md:p-12 border-t border-gray-100 pt-5 md:pt-0">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-1.5 mb-4 md:mb-8 justify-center">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h2 className="text-[14px] md:text-2xl font-black text-gray-900 tracking-tight">{t('faq')}</h2>
                    </div>
                    <div className="space-y-1.5 md:space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <details key={i} className="group bg-slate-50/50 rounded-2xl border border-slate-100/50 overflow-hidden transition-all">
                                <summary className="flex items-center justify-between p-3.5 md:p-5 cursor-pointer list-none">
                                    <span className="text-[12px] md:text-base font-bold text-slate-700 group-open:text-blue-600 transition-colors pr-3">{t(`q${i}` as any)}</span>
                                    <div className="shrink-0 w-5 h-5 rounded-lg bg-white shadow-sm flex items-center justify-center transition-transform group-open:rotate-180">
                                        <ChevronRight size={10} className="rotate-90 text-slate-300 group-open:text-blue-600" strokeWidth={4} />
                                    </div>
                                </summary>
                                <div className="px-3.5 md:px-5 pb-3.5 text-slate-500 text-[11px] md:text-sm leading-relaxed border-t border-white/50 pt-3 font-medium opacity-90 animate-fade-in">
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
