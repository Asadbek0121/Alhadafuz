"use client";

import { Shield, Lock, FileText, Eye } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 py-16 text-center text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-3xl md:text-5xl font-bold relative z-10">Maxfiylik siyosati</h1>
                <p className="text-blue-100 mt-3 text-lg font-light relative z-10">Sizning ma'lumotlaringiz himoyasi - bizning ustuvor vazifamiz</p>
            </div>

            <div className="container max-w-4xl -mt-10 relative z-10 px-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-blue-50">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <div className="bg-blue-50 p-6 rounded-2xl flex items-start gap-4">
                            <div className="p-3 bg-white text-blue-600 rounded-xl shadow-sm"><Shield size={24} /></div>
                            <div>
                                <h4 className="font-bold text-gray-900">Xavfsiz Himoya</h4>
                                <p className="text-sm text-gray-600">Ma'lumotlaringiz shifrlangan holda saqlanadi.</p>
                            </div>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-2xl flex items-start gap-4">
                            <div className="p-3 bg-white text-purple-600 rounded-xl shadow-sm"><Lock size={24} /></div>
                            <div>
                                <h4 className="font-bold text-gray-900">Sir saqlash</h4>
                                <p className="text-sm text-gray-600">Shaxsiy ma'lumotlar uchinchi shaxslarga berilmaydi.</p>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-lg text-gray-700 max-w-none prose-headings:text-slate-900">
                        <h3>1. Umumiy qoidalar</h3>
                        <p>
                            <strong>HADAF</strong> (keyingi o'rinlarda "Biz") foydalanuvchilarning shaxsiy ma'lumotlari xavfsizligini ta'minlashga jiddiy e'tibor beradi.
                            Ushbu hujjat biz qanday ma'lumotlarni to'plashimiz va ulardan qanday foydalanishimizni tushuntiradi.
                        </p>

                        <h3>2. Qanday ma'lumotlarni yig'amiz?</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Shaxsiy ma'lumotlar:</strong> Ism, familiya, telefon raqami, manzil.</li>
                            <li><strong>To'lov ma'lumotlari:</strong> Plastik karta raqamlari (faqat shifrlangan holda to'lov tizimlarida).</li>
                            <li><strong>Texnik ma'lumotlar:</strong> IP-manzil, brauzer turi, qurilma modeli.</li>
                        </ul>

                        <h3>3. Ma'lumotlardan foydalanish</h3>
                        <p>Biz sizning ma'lumotlaringizdan faqat quyidagi maqsadlarda foydalanamiz:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Buyurtmalarni qabul qilish va yetkazib berish.</li>
                            <li>Mijozlarga xizmat ko'rsatish sifatini oshirish.</li>
                            <li>Maxsus aksiyalar va yangiliklar haqida xabardor qilish (faqat roziligingiz bilan).</li>
                        </ul>

                        <h3>4. Cookie fayllar</h3>
                        <p>
                            Saytimiz ishlashini yaxshilash uchun biz Cookie fayllaridan foydalanamiz. Siz brauzer sozlamalari orqali ularni o'chirib qo'yishingiz mumkin.
                        </p>

                        <h3>5. Foydalanuvchi huquqlari</h3>
                        <p>
                            Siz istalgan vaqtda o'z shaxsiy ma'lumotlaringizni o'zgartirish yoki o'chirishni talab qilish huquqiga egasiz. Buning uchun <strong>info@hadaf.uz</strong> ga murojaat qiling.
                        </p>
                    </div>

                    <div className="mt-12 bg-slate-900 text-white rounded-2xl p-8 text-center relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2">Savollaringiz bormi?</h3>
                            <p className="text-slate-300 mb-4">Ma'lumotlar himoyasi bo'yicha mutaxassisimizga yozing</p>
                            <a href="mailto:privacy@hadaf.uz" className="inline-block bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors">
                                privacy@hadaf.uz
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
