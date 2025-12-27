"use client";

import { RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function ReturnsPage() {
    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-gradient-to-r from-red-600 to-pink-700 py-16 text-center text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-3xl md:text-5xl font-bold relative z-10">Qaytarish siyosati</h1>
                <p className="text-red-100 mt-3 text-lg font-light relative z-10">Mahsulotni qaytarish va almashtirish tartibi</p>
            </div>

            <div className="container max-w-4xl -mt-10 relative z-10 px-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-red-50">

                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 mb-8 flex gap-4">
                        <AlertCircle className="w-8 h-8 text-orange-500 shrink-0" />
                        <div>
                            <h3 className="font-bold text-orange-800 text-lg">Muhim Eslatma</h3>
                            <p className="text-orange-700">Mahsulotni qabul qilib olayotganda uning butunligini kuryer oldida tekshirib oling.</p>
                        </div>
                    </div>

                    <div className="prose prose-lg text-gray-700 max-w-none prose-headings:text-slate-900">
                        <h3>1. Qaytarish huquqi</h3>
                        <p>
                            O'zbekiston Respublikasi "Iste'molchilar huquqlarini himoya qilish to'g'risida"gi qonuniga muvofiq, xaridor sifatli mahsulotni <strong>10 kun</strong> (ba'zi hollarda onlayn savdoda uzunroq bo'lishi mumkin, bizda standart 10 kun) ichida qaytarish yoki almashtirish huquqiga ega.
                        </p>

                        <h3>2. Qaytarish shartlari</h3>
                        <p>Mahsulot quyidagi hollarda qaytarib olinadi:</p>
                        <ul className="list-none space-y-2 pl-0">
                            <li className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span>Mahsulot ishlatilmagan bo'lsa;</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span>Tovar ko'rinishi va qadoqlari saqlangan bo'lsa;</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span>Xarid cheki yoki to'lovni tasdiqlovchi hujjat mavjud bo'lsa.</span>
                            </li>
                        </ul>

                        <h3>3. Qaytarib olinmaydigan mahsulotlar</h3>
                        <p>Quyidagi tovarlar qaytarib olinmaydi (agar nuqsoni bo'lmasa):</p>
                        <ul className="list-none space-y-2 pl-0">
                            <li className="flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span>Shaxsiy gigiena vositalari (tish cho'tkalari, ustaralar);</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span>Tibbiy buyumlar va dori vositalari;</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span>Atir-upa va kosmetika vositalari.</span>
                            </li>
                        </ul>

                        <h3>4. Nuqsonli mahsulotlar</h3>
                        <p>
                            Agar mahsulotda zavod nuqsoni aniqlansa, u <strong>kafolat muddati</strong> davomida bepul ta'mirlanadi yoki yangisiga almashtirib beriladi.
                            Buning uchun mahsulot Servis Markazi tomonidan tekshirilishi kerak.
                        </p>

                        <h3>5. Pulni qaytarish</h3>
                        <p>
                            Mahsulot qaytarib olingandan so'ng, to'lov summasi 3 ish kuni ichida xaridorning plastik kartasiga yoki naqd ko'rinishda (to'lov usuliga qarab) qaytariladi.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
