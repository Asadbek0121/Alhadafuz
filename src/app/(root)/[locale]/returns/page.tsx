"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ReturnsPage() {
    const t = useTranslations('Returns');

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-gradient-to-r from-red-600 to-pink-700 py-8 text-center text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-2xl md:text-3xl font-bold relative z-10">{t('title')}</h1>
                <p className="text-red-100 mt-2 text-sm md:text-base font-light relative z-10">{t('subtitle')}</p>
            </div>

            <div className="container max-w-3xl -mt-6 relative z-10 px-4">
                <div className="bg-white rounded-2xl shadow-md p-5 md:p-6 border border-red-50">

                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 flex gap-3">
                        <AlertCircle className="w-6 h-6 text-orange-500 shrink-0" />
                        <div>
                            <h3 className="font-bold text-orange-800 text-base">{t('alert_title')}</h3>
                            <p className="text-orange-700 text-sm">{t('alert_desc')}</p>
                        </div>
                    </div>

                    <div className="prose prose-sm text-gray-700 max-w-none prose-headings:text-slate-900">
                        <h3>{t('s1_title')}</h3>
                        <p>{t('s1_desc')}</p>

                        <h3>{t('s2_title')}</h3>
                        <p>{t('s2_desc')}</p>
                        <ul className="list-none space-y-2 pl-0">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>{t('s2_p1')}</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>{t('s2_p2')}</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>{t('s2_p3')}</span>
                            </li>
                        </ul>

                        <h3>{t('s3_title')}</h3>
                        <p>{t('s3_desc')}</p>
                        <ul className="list-none space-y-2 pl-0">
                            <li className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span>{t('s3_p1')}</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span>{t('s3_p2')}</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span>{t('s3_p3')}</span>
                            </li>
                        </ul>

                        <h3>{t('s4_title')}</h3>
                        <p>{t('s4_desc')}</p>

                        <h3>{t('s5_title')}</h3>
                        <p>{t('s5_desc')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
