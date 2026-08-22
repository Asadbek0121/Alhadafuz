"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function FAQPage() {
    const t = useTranslations('FAQ');

    const faqItems = [
        { q: t('items.q1'), a: t('items.a1') },
        { q: t('items.q2'), a: t('items.a2') },
        { q: t('items.q3'), a: t('items.a3') },
        { q: t('items.q4'), a: t('items.a4') },
        { q: t('items.q5'), a: t('items.a5') },
        { q: t('items.q6'), a: t('items.a6') },
        { q: t('items.q7'), a: t('items.a7') },
        { q: t('items.q8'), a: t('items.a8') },
    ];

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-8 text-center text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-2xl md:text-3xl font-bold relative z-10">{t('title')}</h1>
                <p className="text-purple-100 mt-2 text-sm md:text-base font-light relative z-10">{t('subtitle')}</p>
            </div>

            <div className="container max-w-3xl -mt-6 relative z-10 px-4">
                <div className="bg-white rounded-2xl shadow-md p-5 md:p-6 border border-purple-50">

                    <div className="space-y-3">
                        {faqItems.map((item, idx) => (
                            <details key={idx} className="group border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm open:shadow-md transition-all duration-300">
                                <summary className="flex items-center justify-between p-4 cursor-pointer list-none bg-white hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-open:bg-purple-600 group-open:text-white transition-colors">
                                            <HelpCircle size={16} />
                                        </div>
                                        <span className="font-bold text-gray-800 text-base">{item.q}</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform duration-300" />
                                </summary>
                                <div className="p-4 pt-0 text-gray-600 text-sm leading-relaxed border-t border-transparent group-open:border-gray-100 animate-fade-in-up">
                                    {item.a}
                                </div>
                            </details>
                        ))}
                    </div>

                    <div className="mt-6 bg-gray-900 rounded-2xl p-5 text-center text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-2">{t('cta_title')}</h3>
                            <p className="text-gray-400 text-sm mb-4">{t('cta_desc')}</p>
                            <a href="https://t.me/Hadaf_supportbot" target="_blank" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-blue-600/50">
                                <MessageCircle size={16} />
                                {t('cta_btn')}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
