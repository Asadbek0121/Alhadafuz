"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import {
    Users, Award, ShieldCheck, Zap, MapPin, TrendingUp, Leaf, BookOpen,
    Smile, ShoppingBag, Calendar, Truck, CheckCircle, Target, ArrowRight,
    Globe, MessageCircle, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function AboutPage() {
    const t = useTranslations('About');

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            {/* 1. Hero Section */}
            <div className="relative bg-blue-900 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(67,97,238,0.3),transparent)] z-0"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-950 z-0"></div>

                <div className="absolute inset-0 z-0 opacity-15"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' fill='%23ffffff' fill-opacity='0.4'/%3E%3C/svg%3E")`,
                        backgroundSize: '80px 80px'
                    }}>
                </div>

                <div className="container relative z-10 pt-6 pb-20 md:pt-8 md:pb-28 text-center text-white px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-5xl mx-auto"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 mb-3 md:mb-4 hover:bg-white/20 transition-all cursor-default">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-xs md:text-sm font-bold tracking-widest uppercase">{t('hero_badge')}</span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-3 md:mb-4 tracking-tight leading-[1.1] md:leading-[1.05]">
                            {t('hero_title')} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-blue-300 drop-shadow-sm">
                                {t('hero_title_span')}
                            </span>
                        </h1>

                        <p className="text-sm md:text-base lg:text-lg text-blue-100/90 max-w-4xl mx-auto leading-relaxed font-medium opacity-90">
                            {t('hero_desc')}
                        </p>
                    </motion.div>
                </div>

                {/* Wave Divider — height reduced */}
                <div className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none leading-[0]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full h-auto text-slate-50 fill-current">
                        <path d="M0,80L48,85.3C96,91,192,101,288,96C384,91,480,75,576,74.7C672,75,768,91,864,101.3C960,112,1056,117,1152,112C1248,107,1344,91,1392,82.7L1440,75L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
                    </svg>
                </div>
            </div>

            {/* 2. Mission */}
            <div className="container py-6 md:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
                    <div className="space-y-3 md:space-y-4">
                        <div>
                            <h2 className="text-blue-600 font-bold tracking-wide uppercase text-xs mb-1">{t('mission_tag')}</h2>
                            <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-tight mb-2">
                                {t('mission_title')}
                            </h3>
                            <div className="w-12 h-1 bg-blue-600 rounded-full"></div>
                        </div>
                        <p className="text-sm md:text-base text-gray-600 leading-relaxed text-justify">
                            {t('mission_desc')}
                        </p>

                        <div className="space-y-1.5">
                            {[t('mission_points.p1'), t('mission_points.p2'), t('mission_points.p3')].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2.5 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                        <Target size={14} />
                                    </div>
                                    <span className="font-semibold text-gray-800 text-xs md:text-sm">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative mt-4 lg:mt-0">
                        <div className="absolute -inset-3 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-2xl transform rotate-3"></div>
                        <div className="relative bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 p-4">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full"></div>
                            <div className="space-y-3">
                                {[
                                    { icon: Truck, color: 'bg-green-100 text-green-600', title: t('features.logistic_title'), desc: t('features.logistic_desc') },
                                    { icon: ShieldCheck, color: 'bg-purple-100 text-purple-600', title: t('features.guarantee_title'), desc: t('features.guarantee_desc') },
                                    { icon: Users, color: 'bg-orange-100 text-orange-600', title: t('features.support_title'), desc: t('features.support_desc') },
                                ].map((feat, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg shrink-0 ${feat.color}`}>
                                            <feat.icon size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900">{feat.title}</h4>
                                            <p className="text-xs text-gray-500">{feat.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Stats — haqiqiy ma'lumotlarga asoslangan */}
            <div className="bg-gray-900 py-6 md:py-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                <div className="container relative z-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { value: "18", label: t('stats.categories') || "Kategoriyalar", icon: MapPin },
                            { value: "6+", label: t('stats.products') || "Mahsulotlar", icon: ShoppingBag },
                            { value: "7+", label: t('stats.customers') || "Foydalanuvchilar", icon: Users },
                            { value: "24/7", label: t('stats.support') || "Qo'llab-quvvatlash", icon: MessageCircle },
                        ].map((stat, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="flex justify-center mb-2">
                                    <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                                        <stat.icon size={20} className="text-blue-400" />
                                    </div>
                                </div>
                                <div className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-1 group-hover:scale-110 transition-transform duration-300">
                                    {stat.value}
                                </div>
                                <div className="text-gray-400 font-medium tracking-wide uppercase text-[10px] md:text-xs border-t border-gray-800 pt-1.5 inline-block px-2">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Values Grid */}
            <div className="container py-6 md:py-8">
                <div className="text-center mb-4 md:mb-6">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{t('values_title')}</h2>
                    <p className="text-gray-600 text-sm max-w-2xl mx-auto px-4">{t('values_desc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 md:p-5 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500">
                            <Users size={50} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-base font-bold mb-2">{t('values_cards.v1_title')}</h3>
                            <p className="text-blue-100 text-sm leading-relaxed max-w-lg">
                                {t('values_cards.v1_desc')}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center hover:shadow-md hover:-translate-y-1 transition-all">
                        <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-2">
                            <Award size={18} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1">{t('values_cards.v2_title')}</h3>
                        <p className="text-gray-600 text-xs">{t('values_cards.v2_desc')}</p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center hover:shadow-md hover:-translate-y-1 transition-all">
                        <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-2">
                            <Zap size={18} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1">{t('values_cards.v3_title')}</h3>
                        <p className="text-gray-600 text-xs">{t('values_cards.v3_desc')}</p>
                    </div>

                    <div className="md:col-span-2 bg-slate-100 rounded-2xl p-4 md:p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-50"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-3">
                            <div className="flex-1">
                                <h3 className="text-base font-bold mb-2">{t('values_cards.v4_title')}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {t('values_cards.v4_desc')}
                                </p>
                            </div>
                            <div className="bg-white p-2 rounded-xl shadow-sm hidden md:block">
                                <BookOpen size={24} className="text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. Timeline — haqiqiy git tarixiga asoslangan */}
            <div className="bg-slate-50 py-6 md:py-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

                <div className="container relative z-10">
                    <div className="text-center mb-4">
                        <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">{t('history_tag')}</span>
                        <h2 className="text-lg md:text-xl font-bold text-gray-900 mt-2 mb-2">{t('history_title')}</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto text-sm px-4">
                            {t('history_desc')}
                        </p>
                    </div>

                    <div className="relative max-w-4xl mx-auto px-4">
                        <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-blue-400 to-blue-200 rounded-full"></div>

                        <div className="space-y-6 md:space-y-8">
                            {/* 2025 */}
                            <div className="relative flex flex-col md:flex-row items-center justify-between group">
                                <div className="hidden md:block w-5/12 text-right pr-6">
                                    <h3 className="text-base font-bold text-gray-900 mb-1">{t('history_steps.s1_title')}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        {t('history_steps.s1_desc')}
                                    </p>
                                </div>
                                <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-7 h-7 rounded-full bg-white border-4 border-blue-500 shadow-md flex items-center justify-center z-20 group-hover:scale-125 transition-transform duration-300">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                </div>
                                <div className="w-full md:w-5/12 pl-10 md:pl-6">
                                    <div className="flex items-center gap-2 mb-1 md:hidden">
                                        <span className="text-base font-bold text-blue-600">{t('history_steps.s1_year')}</span>
                                    </div>
                                    <span className="hidden md:block text-xl md:text-2xl font-black text-slate-200 mb-1 group-hover:text-blue-100 transition-colors">{t('history_steps.s1_year')}</span>
                                    <p className="md:hidden text-gray-600 mb-2 text-sm">{t('history_steps.s1_desc')}</p>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                        <Target size={12} /> Start
                                    </div>
                                </div>
                            </div>

                            {/* 2026 */}
                            <div className="relative flex flex-col md:flex-row-reverse items-center justify-between group">
                                <div className="hidden md:block w-5/12 text-left pl-6">
                                    <h3 className="text-base font-bold text-gray-900 mb-1">{t('history_steps.s2_title')}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        {t('history_steps.s2_desc')}
                                    </p>
                                </div>
                                <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-7 h-7 rounded-full bg-blue-600 border-4 border-white shadow-md flex items-center justify-center z-20 group-hover:scale-125 transition-transform duration-300">
                                    <CheckCircle size={14} className="text-white" />
                                </div>
                                <div className="w-full md:w-5/12 pl-10 md:pr-6 md:pl-0 md:text-right">
                                    <div className="flex items-center gap-2 mb-1 md:hidden">
                                        <span className="text-base font-bold text-blue-600">{t('history_steps.s2_year')}</span>
                                    </div>
                                    <span className="hidden md:block text-xl md:text-2xl font-black text-blue-600 mb-1">{t('history_steps.s2_year')}</span>
                                    <p className="md:hidden text-gray-600 mb-2 text-sm">{t('history_steps.s2_desc')}</p>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                                        <Zap size={12} /> Launch
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}