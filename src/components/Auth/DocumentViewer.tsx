"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel

import { useEffect, useRef } from "react";
import { ArrowLeft, X, FileText, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Ommaviy oferta / Maxfiylik siyosati hujjat viewer modali.
 *
 * Login modalining USTIDA (yuqori z-index qatlamida) ochiladi. Login modal
 * mount bo'lib turadi — shuning uchun telefon raqami, checkbox holati va
 * boshqa state saqlanib qoladi. Orqaga qaytganda foydalanuvchi aynan
 * avvalgi holatga qaytadi.
 */
export default function DocumentViewer({
    type,
    onClose,
}: {
    type: 'terms' | 'privacy';
    onClose: () => void;
}) {
    const t = useTranslations(type === 'terms' ? 'Terms' : 'Privacy');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Overlay ochilganda body scroll bloklanadi
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prevOverflow; };
    }, []);

    const isTerms = type === 'terms';

    return (
        <div
            className="fixed inset-0 z-[10050] bg-slate-100 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={t('title')}
        >
            {/* Sarlavha paneli */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-colors flex-none"
                    aria-label="Orqaga"
                    title="Orqaga"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    {isTerms
                        ? <FileText size={20} className="text-blue-600 flex-none" />
                        : <ShieldCheck size={20} className="text-blue-600 flex-none" />}
                    <div className="min-w-0">
                        <h2 className="text-sm md:text-base font-black text-slate-900 leading-tight truncate">
                            {t('title')}
                        </h2>
                        <p className="text-[10px] md:text-xs text-slate-400 font-medium leading-tight truncate">
                            {t('subtitle')}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors flex-none"
                    aria-label="Yopish"
                    title="Yopish"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Hujjat matni — faqat shu qatlam scroll qilinadi */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="max-w-[840px] mx-auto px-4 py-6 md:py-10">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-10 space-y-8">
                        {isTerms ? <TermsBody t={t} /> : <PrivacyBody t={t} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

type AnyT = ReturnType<typeof useTranslations>;

/** Umumiy qoidalar */
function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex-none">{num}</span>
                <h3 className="text-sm md:text-base font-black text-slate-900 m-0 tracking-tight">{title}</h3>
            </div>
            <div className="space-y-2.5 pl-1">
                {children}
            </div>
        </section>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="text-[13px] md:text-sm text-slate-600 leading-relaxed m-0">{children}</p>;
}

function Strong({ t, label, text }: { t: AnyT; label: string; text: string }) {
    return <P><strong className="text-slate-800">{label}</strong> {text}</P>;
}

function TermsBody({ t }: { t: AnyT }) {
    return (
        <>
            <Section num="01" title={t('s1_title')}>
                <Strong t={t} label={t('s1_1_t')} text={t('s1_1_d')} />
                <Strong t={t} label={t('s1_2_t')} text={t('s1_2_d')} />
                <Strong t={t} label={t('s1_3_t')} text={t('s1_3_d')} />
                <Strong t={t} label={t('s1_4_t')} text={t('s1_4_d')} />
            </Section>

            <Section num="02" title={t('s2_title')}>
                {[
                    ['s2_d1_t', 's2_d1_d'],
                    ['s2_d2_t', 's2_d2_d'],
                    ['s2_d3_t', 's2_d3_d'],
                    ['s2_d4_t', 's2_d4_d'],
                    ['s2_d5_t', 's2_d5_d'],
                ].map(([labelKey, textKey]) => (
                    <Strong key={labelKey} t={t} label={t(labelKey as any)} text={t(textKey as any)} />
                ))}
            </Section>

            <Section num="03" title={t('s3_title')}>
                <Strong t={t} label={t('s3_1_t')} text={t('s3_1_d')} />
                <Strong t={t} label={t('s3_2_t')} text={t('s3_2_d')} />
                <Strong t={t} label={t('s3_3_t')} text={t('s3_3_d')} />
                <div className="p-3 md:p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <P><strong className="text-amber-700">{t('s3_alert')}</strong></P>
                </div>
            </Section>

            <Section num="04" title={t('s4_title')}>
                <Strong t={t} label={t('s4_1_t')} text={t('s4_1_d')} />
                <Strong t={t} label={t('s4_2_t')} text={t('s4_2_d')} />
                <Strong t={t} label={t('s4_3_t')} text={t('s4_3_d')} />
                <Strong t={t} label={t('s4_4_t')} text={t('s4_4_d')} />
            </Section>

            <Section num="05" title={t('s5_title')}>
                <Strong t={t} label={t('s5_1_t')} text={t('s5_1_d')} />
                <Strong t={t} label={t('s5_2_t')} text={t('s5_2_d')} />
                <Strong t={t} label={t('s5_3_t')} text={t('s5_3_d')} />
                <Strong t={t} label={t('s5_4_t')} text={t('s5_4_d')} />
                <div className="p-3 md:p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <P><strong className="text-blue-700">{t('s5_note_title')}</strong> {t('s5_note_desc')}</P>
                </div>
            </Section>

            <Section num="06" title={t('s6_title')}>
                <P><strong className="text-slate-800">{t('s6_list_title')}</strong></P>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pl-5 list-disc text-[13px] md:text-sm text-slate-600 leading-relaxed">
                    {(t('s6_list_items') as unknown as string[]).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
                <Strong t={t} label={t('s6_1_t')} text={t('s6_1_d')} />
                <Strong t={t} label={t('s6_2_t')} text={t('s6_2_d')} />
                <Strong t={t} label={t('s6_3_t')} text={t('s6_3_d')} />
            </Section>

            <Section num="07" title={t('s7_title')}>
                <Strong t={t} label={t('s7_1_t')} text={t('s7_1_d')} />
                <Strong t={t} label={t('s7_2_t')} text={t('s7_2_d')} />
                <Strong t={t} label={t('s7_3_t')} text={t('s7_3_d')} />
                <Strong t={t} label={t('s7_4_t')} text={t('s7_4_d')} />
                <Strong t={t} label={t('s7_5_t')} text={t('s7_5_d')} />
                <Strong t={t} label={t('s7_6_t')} text={t('s7_6_d')} />
            </Section>

            <Section num="08" title={t('s8_title')}>
                <Strong t={t} label={t('s8_1_t')} text={t('s8_1_d')} />
                <Strong t={t} label={t('s8_2_t')} text={t('s8_2_d')} />
                <Strong t={t} label={t('s8_3_t')} text={t('s8_3_d')} />
                <div className="p-3 md:p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <P><strong className="text-slate-700">{t('s8_quote')}</strong></P>
                </div>
            </Section>

            <Section num="09" title={t('s9_title')}>
                <Strong t={t} label={t('s9_1_t')} text={t('s9_1_d')} />
                <Strong t={t} label={t('s9_2_t')} text={t('s9_2_d')} />
                <Strong t={t} label={t('s9_3_t')} text={t('s9_3_d')} />
            </Section>
        </>
    );
}

function PrivacyBody({ t }: { t: AnyT }) {
    return (
        <>
            <Section num="01" title={t('s1_title')}>
                <P>{t('s1_p1')}</P>
                <P>{t('s1_p2')}</P>
            </Section>

            <Section num="02" title={t('s2_title')}>
                <P>{t('s2_p1')}</P>
                {[
                    ['s2_c1_title', 's2_c1_desc'],
                    ['s2_c2_title', 's2_c2_desc'],
                    ['s2_c3_title', 's2_c3_desc'],
                    ['s2_c4_title', 's2_c4_desc'],
                ].map(([titleKey, descKey]) => (
                    <Strong key={titleKey} t={t} label={t(titleKey as any) + ':'} text={t(descKey as any)} />
                ))}
            </Section>

            <Section num="03" title={t('s3_title')}>
                <P>{t('s3_p1')}</P>
                <ul className="space-y-2 pl-5 list-disc text-[13px] md:text-sm text-slate-600 leading-relaxed">
                    {['s3_i1', 's3_i2', 's3_i3', 's3_i4'].map((key) => <li key={key}>{t(key as any)}</li>)}
                </ul>
            </Section>

            <Section num="04" title={t('s4_title')}>
                <P>{t('s4_p1')}</P>
                {[
                    ['s4_c1_title', 's4_c1_desc'],
                    ['s4_c2_title', 's4_c2_desc'],
                ].map(([titleKey, descKey]) => (
                    <Strong key={titleKey} t={t} label={t(titleKey as any) + ':'} text={t(descKey as any)} />
                ))}
            </Section>

            <Section num="05" title={t('s5_title')}>
                <P>{t('s5_p1')}</P>
                <ul className="space-y-2 pl-5 list-disc text-[13px] md:text-sm text-slate-600 leading-relaxed">
                    {['s5_i1', 's5_i2', 's5_i3'].map((key) => <li key={key}>{t(key as any)}</li>)}
                </ul>
            </Section>

            <Section num="06" title={t('s6_title')}>
                <P>{t('s6_p1')}</P>
                <ul className="space-y-2 pl-5 list-disc text-[13px] md:text-sm text-slate-600 leading-relaxed">
                    {['s6_r1', 's6_r2', 's6_r3', 's6_r4'].map((key) => <li key={key}>{t(key as any)}</li>)}
                </ul>
            </Section>
        </>
    );
}
