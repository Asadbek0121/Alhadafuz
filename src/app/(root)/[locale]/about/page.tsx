"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import {
    Users, Award, ShieldCheck, Zap, MapPin, TrendingUp, Leaf, BookOpen,
    Smile, ShoppingBag, Calendar, Truck, CheckCircle, Target, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function AboutPage() {
    const t = useTranslations('About');

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            {/* 1. Hero Section with Enhanced Gradient and Pattern */}
            <div className="relative bg-blue-900 overflow-hidden">
                {/* Modern Backdrop Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(67,97,238,0.3),transparent)] z-0"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-950 z-0"></div>

                {/* Geometric Pattern Overlay */}
                <div className="absolute inset-0 z-0 opacity-15"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' fill='%23ffffff' fill-opacity='0.4'/%3E%3C/svg%3E")`,
                        backgroundSize: '80px 80px'
                    }}>
                </div>

                <div className="container relative z-10 pt-8 pb-24 md:pt-10 md:pb-36 text-center text-white px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-5xl mx-auto"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 mb-4 md:mb-5 hover:bg-white/20 transition-all cursor-default">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-xs md:text-sm font-bold tracking-widest uppercase">{t('hero_badge')}</span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 tracking-tight leading-[1.1] md:leading-[1.05]">
                            {t('hero_title')} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-blue-300 drop-shadow-sm">
                                {t('hero_title_span')}
                            </span>
                        </h1>

                        <p className="text-sm md:text-base lg:text-lg text-blue-100/90 max-w-4xl mx-auto leading-relaxed md:leading-relaxed font-medium balance opacity-90">
                            {t('hero_desc')}
                        </p>
                    </motion.div>
                </div>

                {/* Refined Wave Divider */}
                <div className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto text-slate-50 fill-current scale-x-[1.01] origin-bottom">
                        <path fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,176C672,160,768,160,864,176C960,192,1056,224,1152,224C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                </div>
            </div>

            {/* 2. Mission & Vission (Split Layout) */}
            <div className="container py-8 md:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 items-center">
                    <div className="space-y-4 md:space-y-5">
                        <div>
                            <h2 className="text-blue-600 font-bold tracking-wide uppercase text-xs mb-1">{t('mission_tag')}</h2>
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-2">
                                {t('mission_title')}
                            </h3>
                            <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
                        </div>
                        <p className="text-sm md:text-base text-gray-600 leading-relaxed text-justify">
                            {t('mission_desc')}
                        </p>

                        <div className="space-y-2">
                            {[t('mission_points.p1'), t('mission_points.p2'), t('mission_points.p3')].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Target size={16} />
                                    </div>
                                    <span className="font-semibold text-gray-800 text-xs md:text-sm">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Visual Side (Composition) */}
                    <div className="relative mt-6 lg:mt-0">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-[2rem] transform rotate-3"></div>
                        <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 p-4 md:p-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full"></div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-lg shrink-0">
                                        <Truck size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900">{t('features.logistic_title')}</h4>
                                        <p className="text-xs text-gray-500">{t('features.logistic_desc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900">{t('features.guarantee_title')}</h4>
                                        <p className="text-xs text-gray-500">{t('features.guarantee_desc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg shrink-0">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900">{t('features.support_title')}</h4>
                                        <p className="text-xs text-gray-500">{t('features.support_desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Stats Section (Dark Modern) */}
            <div className="bg-gray-900 py-8 md:py-10 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                <div className="container relative z-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { value: "5+", label: t('stats.experience') },
                            { value: "50K+", label: t('stats.customers') },
                            { value: "10K+", label: t('stats.products') },
                            { value: "24/7", label: t('stats.support') },
                        ].map((stat, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-2 group-hover:scale-110 transition-transform duration-300">
                                    {stat.value}
                                </div>
                                <div className="text-gray-400 font-medium tracking-wide uppercase text-[10px] md:text-xs border-t border-gray-800 pt-2 mt-1 inline-block px-2">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Values Grid (Bento Style) */}
            <div className="container py-8 md:py-10">
                <div className="text-center mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{t('values_title')}</h2>
                    <p className="text-gray-600 text-sm max-w-2xl mx-auto px-4">{t('values_desc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Big Card 1 */}
                    <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 md:p-6 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500">
                            <Users size={60} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-2">{t('values_cards.v1_title')}</h3>
                            <p className="text-blue-100 text-sm md:text-base leading-relaxed max-w-lg">
                                {t('values_cards.v1_desc')}
                            </p>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-center hover:transform hover:-translate-y-1 transition-all">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-3">
                            <Award size={20} />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">{t('values_cards.v2_title')}</h3>
                        <p className="text-gray-600 text-xs md:text-sm">{t('values_cards.v2_desc')}</p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-center hover:transform hover:-translate-y-1 transition-all">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-3">
                            <Zap size={20} />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">{t('values_cards.v3_title')}</h3>
                        <p className="text-gray-600 text-xs md:text-sm">{t('values_cards.v3_desc')}</p>
                    </div>

                    {/* Big Card 4 */}
                    <div className="md:col-span-2 bg-slate-100 rounded-2xl p-5 md:p-6 text-gray-900 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-50"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold mb-2">{t('values_cards.v4_title')}</h3>
                                <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                                    {t('values_cards.v4_desc')}
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl shadow-sm hidden md:block">
                                <BookOpen size={28} className="text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* 5. Team Section */}
            <div className="bg-white py-8 md:py-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                <div className="container px-4 relative z-10">
                    <div className="text-center mb-6">
                        <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">{t('team_tag')}</span>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2 mb-4">{t('team_title')}</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { name: "Asadbek Davronov", role: t('team_roles.founder'), img: "/team/asadbek.jpg" },
                            { name: "Jasur Rahmonov", role: t('team_roles.cto'), img: "https://ui-avatars.com/api/?name=Jasur+Rahmonov&background=00A4E4&color=fff&size=200" },
                            { name: "Madina Karimova", role: t('team_roles.marketing'), img: "https://ui-avatars.com/api/?name=Madina+Karimova&background=00A4E4&color=fff&size=200" },
                            { name: "Sardor Alimov", role: t('team_roles.coo'), img: "https://ui-avatars.com/api/?name=Sardor+Alimov&background=00A4E4&color=fff&size=200" },
                        ].map((member, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-2xl p-4 md:p-5 text-center hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group border border-transparent hover:border-1 hover:border-gray-100">
                                <div className="relative w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 md:mb-4 rounded-full p-1 bg-white shadow-lg group-hover:shadow-blue-200/50 transition-shadow">
                                    <img src={member.img} alt={member.name} className="w-full h-full rounded-full object-cover object-top" />
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{member.name}</h3>
                                <p className="text-blue-500 font-semibold text-xs md:text-sm">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 6. History Timeline */}
            <div className="bg-slate-50 py-8 md:py-10 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

                <div className="container relative z-10">
                    <div className="text-center mb-6">
                        <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">{t('history_tag')}</span>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2 mb-4">{t('history_title')}</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-base px-4">
                            {t('history_desc')}
                        </p>
                    </div>

                    <div className="relative max-w-5xl mx-auto px-4">
                        {/* Center Line (Desktop) */}
                        <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 via-blue-400 to-blue-200 rounded-full"></div>

                        <div className="space-y-8 md:space-y-10">
                            {/* 2024 - Idea */}
                            <div className="relative flex flex-col md:flex-row items-center justify-between group">
                                <div className="hidden md:block w-5/12 text-right pr-8">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('history_steps.s1_title')}</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        {t('history_steps.s1_desc')}
                                    </p>
                                </div>

                                <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-8 h-8 rounded-full bg-white border-4 border-blue-500 shadow-xl flex items-center justify-center z-20 group-hover:scale-125 transition-transform duration-300">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                </div>

                                <div className="w-full md:w-5/12 pl-12 md:pl-8">
                                    <div className="flex items-center gap-3 mb-2 md:hidden">
                                        <span className="text-lg font-bold text-blue-600">{t('history_steps.s1_year')}</span>
                                        <h3 className="text-sm font-bold text-gray-900">{t('history_steps.s1_title')}</h3>
                                    </div>
                                    <span className="hidden md:block text-2xl md:text-3xl font-black text-slate-200 mb-2 group-hover:text-blue-100 transition-colors">{t('history_steps.s1_year')}</span>
                                    <p className="md:hidden text-gray-600 mb-3 text-sm">{t('history_steps.s1_desc')}</p>

                                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                                        <Target size={14} /> Start
                                    </div>
                                </div>
                            </div>

                            {/* 2025 - Creation */}
                            <div className="relative flex flex-col md:flex-row-reverse items-center justify-between group">
                                <div className="hidden md:block w-5/12 text-left pl-8">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('history_steps.s2_title')}</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        {t('history_steps.s2_desc')}
                                    </p>
                                </div>

                                <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-8 h-8 rounded-full bg-blue-600 border-4 border-white shadow-xl flex items-center justify-center z-20 group-hover:scale-125 transition-transform duration-300">
                                    <CheckCircle size={16} className="text-white" />
                                </div>

                                <div className="w-full md:w-5/12 pl-12 md:pr-8 md:pl-0 md:text-right">
                                    <div className="flex items-center gap-3 mb-2 md:hidden">
                                        <span className="text-lg font-bold text-blue-600">{t('history_steps.s2_year')}</span>
                                        <h3 className="text-sm font-bold text-gray-900">{t('history_steps.s2_title')}</h3>
                                    </div>
                                    <span className="hidden md:block text-2xl md:text-3xl font-black text-blue-600 mb-2 transform md:translate-x-2">{t('history_steps.s2_year')}</span>
                                    <p className="md:hidden text-gray-600 mb-3 text-sm">{t('history_steps.s2_desc')}</p>

                                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-100">
                                        <Zap size={14} /> Active Development
                                    </div>
                                </div>
                            </div>

                            {/* 2026 - Launch */}
                            <div className="relative flex flex-col md:flex-row items-center justify-between group">
                                <div className="hidden md:block w-5/12 text-right pr-8">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('history_steps.s3_title')}</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        {t('history_steps.s3_desc')}
                                    </p>
                                </div>

                                <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 border-4 border-white shadow-xl flex items-center justify-center z-20 group-hover:scale-125 transition-transform duration-300">
                                    <TrendingUp size={16} className="text-white" />
                                </div>

                                <div className="w-full md:w-5/12 pl-12 md:pl-8">
                                    <div className="flex items-center gap-3 mb-2 md:hidden">
                                        <span className="text-lg font-bold text-purple-600">{t('history_steps.s3_year')}</span>
                                        <h3 className="text-sm font-bold text-gray-900">{t('history_steps.s3_title')}</h3>
                                    </div>
                                    <span className="hidden md:block text-2xl md:text-3xl font-black text-slate-200 mb-2 group-hover:text-purple-100 transition-colors">{t('history_steps.s3_year')}</span>
                                    <p className="md:hidden text-gray-600 mb-3 text-sm">{t('history_steps.s3_desc')}</p>

                                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100">
                                        <ArrowRight size={14} /> Growth
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
