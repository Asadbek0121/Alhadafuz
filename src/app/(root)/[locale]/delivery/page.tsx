"use client";

import { Truck, Clock, MapPin, Zap } from 'lucide-react';

export default function DeliveryPage() {
    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 py-16 text-center text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-3xl md:text-5xl font-bold relative z-10">Tezkor yetkazib berish</h1>
                <p className="text-orange-100 mt-3 text-lg font-light relative z-10">Surxondaryo bo'ylab ishonchli xizmat</p>
            </div>

            <div className="container max-w-5xl -mt-10 relative z-10 px-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-orange-50">

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {/* Card 1 */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all group">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <Truck size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Termiz shahri</h3>
                            <p className="text-gray-500 text-sm mb-4">Shahar ichida tezkor yetkazib berish xizmati.</p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2"><Clock size={16} className="text-green-500" /> <strong>1 kun</strong> ichida</li>
                                <li className="flex items-center gap-2"><Zap size={16} className="text-orange-500" /> Narxi: <strong>15 000 so'm</strong></li>
                            </ul>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all group">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                                <MapPin size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Surxondaryo tumanlari</h3>
                            <p className="text-gray-500 text-sm mb-4">Barcha tumanlarga kuryerlik xizmati.</p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2"><Clock size={16} className="text-green-500" /> <strong>2-3 kun</strong> ichida</li>
                                <li className="flex items-center gap-2"><Zap size={16} className="text-orange-500" /> Narxi: <strong>Masofaga qarab</strong></li>
                            </ul>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all group">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                                <Truck size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Respublika bo'ylab</h3>
                            <p className="text-gray-500 text-sm mb-4">Fargo / BTS pochta orqali.</p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2"><Clock size={16} className="text-green-500" /> <strong>3-5 kun</strong> ichida</li>
                                <li className="flex items-center gap-2"><Zap size={16} className="text-orange-500" /> Narxi: <strong>Pochta tarifi</strong></li>
                            </ul>
                        </div>
                    </div>

                    <div className="prose prose-lg text-gray-700 max-w-none prose-headings:text-slate-900">
                        <h3>Yetkazib berish shartlari</h3>
                        <p>
                            Buyurtma tasdiqlangandan so'ng, kuryerlarimiz siz bilan bog'lanib, yetkazib berish vaqtini kelishib oladilar.
                            Iltimos, telefon raqamingiz har doim aloqada bo'lishini ta'minlang.
                        </p>
                        <p>
                            Katta hajmdagi maishiy texnika (muzlatgich, kir yuvish mashinasi) yetkazib berilganda, ularni xonadongizga olib kirish xizmati alohida kelishuv asosida amalga oshirilishi mumkin.
                        </p>

                        <div className="bg-slate-50 border-l-4 border-blue-600 p-6 rounded-r-xl mt-8">
                            <p className="m-0 font-medium text-slate-800">
                                <strong>Diqqat!</strong> Agar mahsulot yetkazib berilganda unda tashqi nuqsonlar aniqlansa, darhol kuryerga xabar bering va mahsulotni qabul qilmang.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
