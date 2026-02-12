"use client";

import { Truck, Clock, MapPin, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function DeliveryPage() {
    const t = useTranslations('Delivery');

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 py-16 text-center text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-3xl md:text-5xl font-bold relative z-10">{t('title')}</h1>
                <p className="text-orange-100 mt-3 text-lg font-light relative z-10">{t('subtitle')}</p>
            </div>

            <div className="container max-w-5xl -mt-10 relative z-10 px-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-orange-50">

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {/* Card 1 */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all group">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <Truck size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('termiz_title')}</h3>
                            <p className="text-gray-500 text-sm mb-4">{t('termiz_desc')}</p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Clock size={16} className="text-green-500" />
                                    <span>{t.rich('delivery_time', { bold: (chunks) => <strong>{chunks}</strong>, time: t('termiz_time') })}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Zap size={16} className="text-orange-500" />
                                    <span>{t.rich('price_prefix', { bold: (chunks) => <strong>{chunks}</strong>, price: t('termiz_price') })}</span>
                                </li>
                            </ul>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all group">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                                <MapPin size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('region_title')}</h3>
                            <p className="text-gray-500 text-sm mb-4">{t('region_desc')}</p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Clock size={16} className="text-green-500" />
                                    <span>{t.rich('delivery_time', { bold: (chunks) => <strong>{chunks}</strong>, time: t('region_time') })}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Zap size={16} className="text-orange-500" />
                                    <span>{t.rich('price_prefix', { bold: (chunks) => <strong>{chunks}</strong>, price: t('region_price') })}</span>
                                </li>
                            </ul>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all group">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                                <Truck size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('country_title')}</h3>
                            <p className="text-gray-500 text-sm mb-4">{t('country_desc')}</p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Clock size={16} className="text-green-500" />
                                    <span>{t.rich('delivery_time', { bold: (chunks) => <strong>{chunks}</strong>, time: t('country_time') })}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Zap size={16} className="text-orange-500" />
                                    <span>{t.rich('price_prefix', { bold: (chunks) => <strong>{chunks}</strong>, price: t('country_price') })}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="prose prose-lg text-gray-700 max-w-none prose-headings:text-slate-900">
                        <h3>{t('terms_title')}</h3>
                        <p>{t('terms_p1')}</p>
                        <p>{t('terms_p2')}</p>

                        <div className="bg-slate-50 border-l-4 border-blue-600 p-6 rounded-r-xl mt-8">
                            <p className="m-0 font-medium text-slate-800">
                                <strong>{t('warning_title')}</strong> {t('warning_desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
