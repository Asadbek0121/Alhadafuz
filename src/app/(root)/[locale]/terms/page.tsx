"use client";

import { ShieldCheck, Scale, FileText, Lock, Truck, RefreshCcw, AlertTriangle, Gavel, ArrowRight, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';

export default function TermsPage() {
    const t = useTranslations('Terms');
    const locale = useLocale();
    const [activeSection, setActiveSection] = useState('general');

    const sections = [
        { id: 'general', title: t('sections.general'), icon: FileText },
        { id: 'definitions', title: t('sections.definitions'), icon: ShieldCheck },
        { id: 'intellectual', title: t('sections.intellectual'), icon: Lock },
        { id: 'payment', title: t('sections.payment'), icon: Scale },
        { id: 'delivery', title: t('sections.delivery'), icon: Truck },
        { id: 'returns', title: t('sections.returns'), icon: RefreshCcw },
        { id: 'privacy', title: t('sections.privacy'), icon: ShieldCheck },
        { id: 'liability', title: t('sections.liability'), icon: AlertTriangle },
        { id: 'disputes', title: t('sections.disputes'), icon: Gavel },
    ];

    const handleDownloadPDF = () => {
        window.print();
    };

    const renderContent = (sectionId?: string) => {
        const id = sectionId || activeSection;

        switch (id) {
            case 'general':
                return (
                    <motion.div
                        key="general"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="inline-flex p-2.5 rounded-2xl bg-blue-100 text-blue-600 font-bold text-sm">01</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{t('s1_title')}</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>{t('s1_1_t')}</strong> {t('s1_1_d')}</p>
                                <p><strong>{t('s1_2_t')}</strong> {t('s1_2_d')}</p>
                                <p><strong>{t('s1_3_t')}</strong> {t('s1_3_d')}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-7 text-white text-xs space-y-3 shadow-xl shadow-blue-600/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Scale size={80} />
                                </div>
                                <p className="font-black text-sm uppercase tracking-wider">{t('s1_4_t')}</p>
                                <p className="leading-relaxed font-medium">{t('s1_4_d')}</p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'definitions':
                return (
                    <motion.div
                        key="definitions"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="inline-flex p-2.5 rounded-2xl bg-emerald-100 text-emerald-600 font-bold text-sm">02</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{t('s2_title')}</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { t: t('s2_d1_t'), d: t('s2_d1_d'), icon: FileText },
                                { t: t('s2_d2_t'), d: t('s2_d2_d'), icon: CheckCircle2 },
                                { t: t('s2_d3_t'), d: t('s2_d3_d'), icon: ShieldCheck },
                                { t: t('s2_d4_t'), d: t('s2_d4_d'), icon: Truck },
                                { t: t('s2_d5_t'), d: t('s2_d5_d'), icon: Lock }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-6 rounded-3xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-50 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <item.icon size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 text-sm mb-1">{item.t}</h4>
                                        <p className="text-slate-500 text-xs leading-relaxed m-0 font-medium">{item.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );
            case 'intellectual':
                return (
                    <motion.div
                        key="intellectual"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="inline-flex p-2.5 rounded-2xl bg-orange-100 text-orange-600 font-bold text-sm">03</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{t('s3_title')}</h2>
                        </div>
                        <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden space-y-6 shadow-2xl">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full -mr-40 -mt-40 blur-3xl"></div>
                            <div className="relative z-10 space-y-5 text-sm leading-relaxed">
                                <p><strong>{t('s3_1_t')}</strong> {t('s3_1_d')}</p>
                                <p><strong>{t('s3_2_t')}</strong> {t('s3_2_d')}</p>
                                <p><strong>{t('s3_3_t')}</strong> {t('s3_3_d')}</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-orange-400 font-bold text-xs flex items-center gap-4">
                                <AlertTriangle size={24} className="shrink-0" />
                                <p className="m-0 leading-relaxed uppercase tracking-tighter italic">{t('s3_alert')}</p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'payment':
                return (
                    <motion.div
                        key="payment"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="inline-flex p-2.5 rounded-2xl bg-purple-100 text-purple-600 font-bold text-sm">04</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{t('s4_title')}</h2>
                        </div>
                        <div className="space-y-5 text-slate-600 text-sm leading-relaxed font-medium">
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>{t('s4_1_t')}</strong> {t('s4_1_d')}</p>
                                <p><strong>{t('s4_2_t')}</strong> {t('s4_2_d')}</p>
                                <p><strong>{t('s4_3_t')}</strong> {t('s4_3_d')}</p>
                                <p><strong>{t('s4_4_t')}</strong> {t('s4_4_d')}</p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'delivery':
                return (
                    <motion.div
                        key="delivery"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="inline-flex p-2.5 rounded-2xl bg-blue-100 text-blue-600 font-bold text-sm">05</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{t('s5_title')}</h2>
                        </div>
                        <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>{t('s5_1_t')}</strong> {t('s5_1_d')}</p>
                                <p><strong>{t('s5_2_t')}</strong> {t('s5_2_d')}</p>
                                <p><strong>{t('s5_3_t')}</strong> {t('s5_3_d')}</p>
                                <p><strong>{t('s5_4_t')}</strong> {t('s5_4_d')}</p>
                            </div>
                            <div className="bg-blue-600 rounded-3xl p-8 text-white flex items-start gap-6 shadow-xl relative overflow-hidden group">
                                <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <Truck size={150} />
                                </div>
                                <div className="relative z-10 space-y-2">
                                    <p className="font-black text-base italic uppercase">{t('s5_note_title')}</p>
                                    <p className="text-xs opacity-90 leading-relaxed font-medium">{t('s5_note_desc')}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'returns':
                return (
                    <motion.div
                        key="returns"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="inline-flex p-2.5 rounded-2xl bg-red-100 text-red-600 font-bold text-sm">06</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{t('s6_title')}</h2>
                        </div>
                        <div className="space-y-5 text-slate-600 text-sm leading-relaxed font-medium">
                            <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white border-2 border-red-500/20 shadow-xl space-y-5">
                                <h4 className="text-lg font-black flex items-center gap-3 text-red-500 uppercase tracking-tight">
                                    <RefreshCcw size={24} /> {t('s6_list_title')}
                                </h4>
                                <p className="text-xs opacity-60 italic border-l-2 border-red-500 pl-4">{t('s6_list_desc')}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {t.raw('s6_list_items').map((item: string, i: number) => (
                                        <div key={i} className="px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black text-center uppercase tracking-tighter hover:bg-red-500/10 transition-colors uppercase">{item}</div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>{t('s6_1_t')}</strong> {t('s6_1_d')}</p>
                                <p><strong>{t('s6_2_t')}</strong> {t('s6_2_d')}</p>
                                <p><strong>{t('s6_3_t')}</strong> {t('s6_3_d')}</p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'privacy':
                return (
                    <motion.div
                        key="privacy"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="inline-flex p-2.5 rounded-2xl bg-emerald-100 text-emerald-600 font-bold text-sm">07</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{t('s7_title')}</h2>
                        </div>
                        <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>{t('s7_1_t')}</strong> {t('s7_1_d')}</p>
                                <p><strong>{t('s7_2_t')}</strong> {t('s7_2_d')}</p>
                                <p><strong>{t('s7_3_t')}</strong> {t('s7_3_d')}</p>
                                <p><strong>{t('s7_4_t')}</strong> {t('s7_4_d')}</p>
                                <p><strong>{t('s7_5_t')}</strong> {t('s7_5_d')}</p>
                                <p><strong>{t('s7_6_t')}</strong> {t('s7_6_d')}</p>
                            </div>
                            <div className="p-10 rounded-[2.5rem] bg-emerald-900 text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-emerald-900/10">
                                <ShieldCheck size={60} className="shrink-0 text-emerald-400 opacity-80" />
                                <div className="space-y-2">
                                    <p className="m-0 text-base font-black uppercase tracking-widest tracking-tighter">{t('s7_badge')}</p>
                                    <p className="m-0 text-xs opacity-70 leading-relaxed font-medium">{t('s7_desc')}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'liability':
                return (
                    <motion.div
                        key="liability"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="inline-flex p-2.5 rounded-2xl bg-slate-200 text-slate-900 font-bold text-sm">08</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{t('s8_title')}</h2>
                        </div>
                        <div className="bg-red-50/30 border-2 border-red-100/50 rounded-[2.5rem] p-9 space-y-6 text-sm text-slate-700 leading-relaxed font-medium">
                            <div className="space-y-4">
                                <p><strong>{t('s8_1_t')}</strong> {t('s8_1_d')}</p>
                                <p><strong>{t('s8_2_t')}</strong> {t('s8_2_d')}</p>
                                <p><strong>{t('s8_3_t')}</strong> {t('s8_3_d')}</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-white border border-red-100 text-xs italic opacity-80 shadow-sm">
                                "{t('s8_quote')}"
                            </div>
                        </div>
                    </motion.div>
                );
            case 'disputes':
                return (
                    <motion.div
                        key="disputes"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="inline-flex p-2.5 rounded-2xl bg-indigo-100 text-indigo-600 font-bold text-sm">09</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{t('s9_title')}</h2>
                        </div>
                        <div className="space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
                            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl border border-slate-100 border-t-8 border-indigo-600 space-y-5">
                                <h4 className="text-indigo-600 font-extrabold text-lg flex items-center gap-3">
                                    <Gavel size={24} /> {t('s9_1_t')}
                                </h4>
                                <p className="m-0 text-slate-700 leading-relaxed">{t('s9_1_d')}</p>
                            </div>
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>{t('s9_2_t')}</strong> {t('s9_2_d')}</p>
                                <p><strong>{t('s9_3_t')}</strong> {t('s9_3_d')}</p>
                            </div>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    const renderAllSectionsForPrint = () => {
        return (
            <div className="hidden print:block space-y-12">
                {sections.map((section, index) => (
                    <div key={section.id} className="print-section">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="text-2xl font-black text-blue-600">{(index + 1).toString().padStart(2, '0')}</div>
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">{section.title}</h2>
                        </div>
                        <div className="print-content-area">
                            {renderContent(section.id)}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-12 print:bg-white print:pb-0">
            {/* Global Print Styles to hide external layout elements */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Force hide EVERYTHING that isn't the main content */
                    nav, header, footer, 
                    [class*="BottomNav"], 
                    [class*="SupportChat"],
                    .support-fab, 
                    .support-window,
                    button, 
                    aside,
                    .print\\:hidden,
                    #__next-prerender-indicator {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        width: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        position: absolute !important;
                        top: -9999px !important;
                    }
                    
                    body {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    .container {
                        width: 100% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Section spacing for print */
                    .print-section {
                        page-break-inside: avoid;
                        margin-bottom: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #f1f5f9;
                    }

                    .print-section:first-child {
                        border-top: none;
                    }

                    @page {
                        margin: 15mm;
                        size: auto;
                    }
                }
            `}} />

            {/* Print Only Header */}
            <div className="hidden print:block mb-12 border-b-2 border-slate-900 pb-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">{t('title')}</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">HADAF.UZ • {t('badge')}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-slate-900">{t('ui.location')}, O'ZBEKISTON</p>
                        <p className="text-slate-500 text-xs">{t('last_updated')}</p>
                    </div>
                </div>
            </div>

            {/* Web Header */}
            <div className="relative bg-[#0f172a] py-16 md:py-24 overflow-hidden shadow-2xl print:hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent"></div>
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-7xl font-black text-white mb-4 tracking-tighter uppercase leading-none"
                    >
                        {t('title')}
                    </motion.h1>
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-1 w-20 bg-blue-600 rounded-full mb-2"></div>
                        <p className="text-slate-400 text-xs md:text-sm font-black uppercase tracking-[0.4em]">
                            Surxondaryo • Termiz • HADAF.UZ
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-12 relative z-20 print:mt-0 print:px-0 print:static">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">

                    {/* Sidebar */}
                    <aside className="lg:col-span-3 hidden lg:block print:hidden">
                        <div className="bg-white rounded-[2.5rem] shadow-xl p-5 sticky top-24 border border-slate-100 shadow-slate-200/50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-4">{t('ui.table_of_contents')}</h3>
                            <nav className="space-y-1.5">
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => {
                                            setActiveSection(section.id);
                                            window.scrollTo({ top: 150, behavior: 'smooth' });
                                        }}
                                        className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-[11px] font-black tracking-tight transition-all duration-300 ${activeSection === section.id
                                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 -translate-y-1'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:translate-x-1'
                                            }`}
                                    >
                                        <section.icon size={16} className={activeSection === section.id ? 'opacity-100' : 'opacity-40'} />
                                        {section.title}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <div className="lg:col-span-9 space-y-8 print:space-y-0">
                        {/* Interactive View (Web Only) */}
                        <div className="bg-white rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden print:hidden">
                            <div className="p-8 md:p-16 min-h-[550px]">
                                <AnimatePresence mode="wait">
                                    {renderContent()}
                                </AnimatePresence>
                            </div>

                            {/* Nav Buttons */}
                            <div className="px-8 md:px-16 pb-12 flex justify-between gap-4">
                                {sections.findIndex(s => s.id === activeSection) > 0 && (
                                    <button
                                        onClick={() => {
                                            const idx = sections.findIndex(s => s.id === activeSection);
                                            setActiveSection(sections[idx - 1].id);
                                            window.scrollTo({ top: 150, behavior: 'smooth' });
                                        }}
                                        className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest"
                                    >
                                        <ArrowRight size={16} className="rotate-180" /> Oldingi bo'lim
                                    </button>
                                )}
                                {sections.findIndex(s => s.id === activeSection) < sections.length - 1 ? (
                                    <button
                                        onClick={() => {
                                            const idx = sections.findIndex(s => s.id === activeSection);
                                            setActiveSection(sections[idx + 1].id);
                                            window.scrollTo({ top: 150, behavior: 'smooth' });
                                        }}
                                        className="ml-auto flex items-center gap-3 px-10 py-5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl hover:-translate-y-1"
                                    >
                                        {t('ui.next_section')} <ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                        className="ml-auto px-10 py-5 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all"
                                    >
                                        {t('ui.document_end')}
                                    </button>
                                )}
                            </div>

                            {/* Footer (Web Only) */}
                            <div className="bg-slate-50/50 p-10 flex flex-col md:flex-row justify-between items-center border-t border-slate-100 gap-8 print:hidden">
                                <div className="flex gap-5 items-center">
                                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-blue-50">
                                        <img src="/logo.png" alt="Hadaf Logo" className="w-8 h-auto grayscale opacity-50" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] leading-none">{t('ui.doc_control')}</p>
                                        <p className="text-[12px] text-slate-800 font-extrabold tracking-tighter">HADAF LEGAL FRAMEWORK {t('badge')}</p>
                                    </div>
                                </div>
                                <div className="text-center md:text-right space-y-1">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{t('ui.last_edit')}</p>
                                    <p className="text-[11px] text-slate-900 font-black italic tracking-tight underline decoration-blue-500/30">{t('last_updated')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Full Document For Print (Visible only in PDF/Print) */}
                        {renderAllSectionsForPrint()}

                        {/* External Links */}
                        <div className="flex flex-col sm:flex-row gap-5 pb-12 print:hidden">
                            <Link
                                href={`/${locale}/privacy`}
                                className="flex-1 bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-lg shadow-slate-200/30 hover:shadow-2xl transition-all duration-300 group flex items-center justify-between"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <span className="font-black text-slate-900 text-lg tracking-tight">{t('ui.privacy_policy')}</span>
                                </div>
                                <ChevronRight size={20} className="text-blue-500 group-hover:translate-x-2 transition-all" />
                            </Link>

                            <button
                                onClick={handleDownloadPDF}
                                className="flex-1 bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-lg shadow-slate-200/30 hover:shadow-2xl transition-all duration-300 group flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <FileText size={24} />
                                    </div>
                                    <span className="font-black text-slate-900 text-lg tracking-tight">{t('ui.download_pdf')}</span>
                                </div>
                                <ChevronRight size={20} className="text-blue-500 group-hover:translate-x-2 transition-all" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
