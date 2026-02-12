"use client";

import { Shield, Lock, FileText, Eye, ShieldCheck, Database, Share2, Bell, Smartphone, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

export default function PrivacyPage() {
    const t = useTranslations('Privacy');
    const locale = useLocale();

    const highlights = [
        { icon: Lock, title: t('highlights.h1_title'), desc: t('highlights.h1_desc'), color: "blue" },
        { icon: Shield, title: t('highlights.h2_title'), desc: t('highlights.h2_desc'), color: "emerald" },
        { icon: Database, title: t('highlights.h3_title'), desc: t('highlights.h3_desc'), color: "indigo" }
    ];

    const dataTypes = [
        { title: t('s2_c1_title'), desc: t('s2_c1_desc') },
        { title: t('s2_c2_title'), desc: t('s2_c2_desc') },
        { title: t('s2_c3_title'), desc: t('s2_c3_desc') },
        { title: t('s2_c4_title'), desc: t('s2_c4_desc') },
    ];

    const purposes = [
        t('s3_i1'),
        t('s3_i2'),
        t('s3_i3'),
        t('s3_i4'),
    ];

    const userRights = [
        t('s6_r1'),
        t('s6_r2'),
        t('s6_r3'),
        t('s6_r4'),
    ];

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-20">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-[#0052FF] via-[#0033CC] to-[#001A66] py-20 text-center text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="container relative z-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider mb-6">
                        <ShieldCheck size={16} className="text-blue-300" />
                        {t('badge')}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">{t('title')}</h1>
                    <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        {t('subtitle')}
                    </p>
                </motion.div>
            </div>

            <div className="container max-w-5xl -mt-12 relative z-10 px-4">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 p-8 md:p-14 border border-blue-50">

                    {/* Key Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        {highlights.map((item, i) => (
                            <div key={i} className={`p-6 rounded-3xl flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-500`}
                                style={{ backgroundColor: item.color === 'blue' ? '#eff6ff' : item.color === 'emerald' ? '#ecfdf5' : '#eef2ff' }}
                            >
                                <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors`}>
                                    <item.icon size={24} />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-slate-900 prose-li:text-slate-600">
                        <div className="space-y-12">
                            <section>
                                <h2 className="text-2xl flex items-center gap-3 mb-6">
                                    <FileText className="text-blue-600" /> {t('s1_title')}
                                </h2>
                                <p>{t('s1_p1')}</p>
                                <p>{t('s1_p2')}</p>
                            </section>

                            <section className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                                <h2 className="text-2xl flex items-center gap-3 mb-6">
                                    <Smartphone className="text-blue-600" /> {t('s2_title')}
                                </h2>
                                <p>{t('s2_p1')}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    {dataTypes.map((item, idx) => (
                                        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                            <h4 className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-wide">{item.title}</h4>
                                            <p className="text-xs m-0">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl flex items-center gap-3 mb-6">
                                    <Eye className="text-blue-600" /> {t('s3_title')}
                                </h2>
                                <p>{t('s3_p1')}</p>
                                <ul className="list-none space-y-4 pl-0">
                                    {purposes.map((text, idx) => (
                                        <li key={idx} className="flex gap-4 items-start p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-1">{idx + 1}</div>
                                            <span className="text-sm font-medium">{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <h2 className="text-2xl flex items-center gap-3 mb-6 text-white">
                                    <Server className="text-blue-400" /> {t('s4_title')}
                                </h2>
                                <div className="space-y-4 text-sm opacity-90 leading-relaxed">
                                    <p>{t('s4_p1')}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                            <p className="font-bold text-blue-300 m-0 text-xs mb-1">{t('s4_c1_title')}</p>
                                            <p className="m-0 text-[11px]">{t('s4_c1_desc')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                            <p className="font-bold text-blue-300 m-0 text-xs mb-1">{t('s4_c2_title')}</p>
                                            <p className="m-0 text-[11px]">{t('s4_c2_desc')}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl flex items-center gap-3 mb-6">
                                    <Share2 className="text-blue-600" /> {t('s5_title')}
                                </h2>
                                <p>{t('s5_p1')}</p>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start border-l-4 border-blue-600 pl-6 py-2">
                                        <p className="text-sm m-0">{t('s5_i1')}</p>
                                    </div>
                                    <div className="flex gap-4 items-start border-l-4 border-slate-300 pl-6 py-2">
                                        <p className="text-sm m-0">{t('s5_i2')}</p>
                                    </div>
                                    <div className="flex gap-4 items-start border-l-4 border-slate-300 pl-6 py-2">
                                        <p className="text-sm m-0">{t('s5_i3')}</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl flex items-center gap-3 mb-6">
                                    <ShieldCheck className="text-blue-600" /> {t('s6_title')}
                                </h2>
                                <p>{t('s6_p1')}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {userRights.map((text, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                            <span className="text-xs font-bold text-slate-700">{text}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="mt-20 p-10 rounded-[3rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center relative overflow-hidden border border-white/10">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="inline-flex p-4 rounded-full bg-blue-600/20 text-blue-400 mb-2">
                                <ShieldCheck size={40} />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black">{t('cta_title')}</h3>
                            <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
                                {t('cta_desc')}
                            </p>
                            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-8">
                                <a href="mailto:privacy@hadaf.uz" className="flex items-center gap-3 bg-[#0052FF] text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-[#0040CC] transition-all hover:scale-105 shadow-xl shadow-blue-600/20 uppercase tracking-widest">
                                    <Bell size={20} /> privacy@hadaf.uz
                                </a>
                                <Link href={`/${locale}/terms`} className="flex items-center gap-3 bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-white/20 transition-all border border-white/10 uppercase tracking-widest">
                                    {t('cta_btn_terms')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
