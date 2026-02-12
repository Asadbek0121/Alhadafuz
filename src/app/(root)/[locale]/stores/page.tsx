"use client";

import { MapPin, Phone, Clock, Loader2, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type Store = {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    workingHours: string | null;
    lat: number | null;
    lng: number | null;
};

export default function StoresPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const t = useTranslations('Stores');

    useEffect(() => {
        fetch('/api/stores')
            .then(res => res.json())
            .then(data => {
                setStores(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 py-16 text-center text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-3xl md:text-5xl font-bold relative z-10">{t('title')}</h1>
                <p className="text-emerald-100 mt-3 text-lg font-light relative z-10">{t('subtitle')}</p>
            </div>

            <div className="container max-w-6xl -mt-10 relative z-10 px-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-emerald-50 min-h-[500px]">

                    <div className="text-center mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('intro_title')}</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            {t('intro_desc')}
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="animate-spin text-emerald-600 w-12 h-12" />
                        </div>
                    ) : (
                        <>
                            {stores.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {stores.map((store) => (
                                        <div key={store.id} className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-2">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                    <MapPin size={28} />
                                                </div>
                                                <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">{t('status_open')}</span>
                                            </div>

                                            <h3 className="text-xl font-bold text-gray-900 mb-4">{store.name}</h3>

                                            <div className="space-y-4 text-gray-600">
                                                <div className="flex items-start gap-4">
                                                    <MapPin className="w-5 h-5 mt-1 shrink-0 text-gray-400" />
                                                    <span className="text-sm">{store.address}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Phone className="w-5 h-5 shrink-0 text-gray-400" />
                                                    <span className="text-sm font-medium">{store.phone || t('no_phone')}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Clock className="w-5 h-5 shrink-0 text-gray-400" />
                                                    <span className="text-sm">{store.workingHours || "09:00 - 18:00"}</span>
                                                </div>
                                            </div>

                                            {store.lat && store.lng ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full mt-8 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-900 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 no-underline shadow-sm hover:shadow-lg hover:shadow-emerald-200"
                                                >
                                                    <Navigation size={18} />
                                                    <span>{t('view_map')}</span>
                                                </a>
                                            ) : (
                                                <div className="w-full mt-8 bg-gray-50 text-gray-400 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 opacity-60">
                                                    <Navigation size={18} />
                                                    <span>{t('no_location')}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <MapPin className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">{t('empty_title')}</h3>
                                    <p className="text-gray-500 mt-2">{t('empty_desc')}</p>
                                </div>
                            )}
                        </>
                    )}

                    <div className="mt-20 border-t border-gray-100 pt-12">
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-8">{t('upcoming_title')}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            {['Denov', 'Sherobod', 'Boysun', 'Jarqo\'rg\'on'].map((city, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 opacity-60">
                                    <span className="font-bold text-gray-500">{city}</span>
                                    <span className="block text-xs text-gray-400 mt-1">{t('upcoming_label')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
