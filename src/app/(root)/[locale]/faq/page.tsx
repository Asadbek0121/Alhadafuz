"use client";

import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';

export default function FAQPage() {
    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-16 text-center text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-3xl md:text-5xl font-bold relative z-10">Ko'p beriladigan savollar</h1>
                <p className="text-purple-100 mt-3 text-lg font-light relative z-10">Sizni qiziqtirgan savollarga javoblar</p>
            </div>

            <div className="container max-w-4xl -mt-10 relative z-10 px-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-purple-50">

                    <div className="space-y-4">
                        {[
                            {
                                q: "Yetkazib berish narxi qancha?",
                                a: "Termiz shahri ichida yetkazib berish narxi - 15 000 so'm. Tumanlarga yetkazib berish narxi masofaga qarab belgilanadi."
                            },
                            {
                                q: "Buyurtma qancha vaqtda yetib keladi?",
                                a: "Termiz shahrida 24 soat ichida. Surxondaryo tumanlariga 2-3 kun ichida yetkazib beriladi."
                            },
                            {
                                q: "To'lov turlari qanday?",
                                a: "Siz to'lovni naqd pul, Payme, Click yoki Uzcard/Humo plastik kartalari orqali amalga oshirishingiz mumkin."
                            },
                            {
                                q: "Mahsulotga kafolat bormi?",
                                a: "Ha, barcha texnika va elektronika mahsulotlari uchun rasmiy ishlab chiqaruvchi kafolati taqdim etiladi."
                            },
                            {
                                q: "Nasiya savdo bormi?",
                                a: "Hozirda nasiya savdo xizmati mavjud emas. Biz faqat to'liq to'lov asosida ishlaymiz."
                            },
                            {
                                q: "Do'koningiz qayerda joylashgan?",
                                a: "Bizning markaziy do'konimiz Termiz shahrida joylashgan. Aniq manzilni 'Bizning do'konlar' sahifasidan topishingiz mumkin."
                            },
                            {
                                q: "Qanday qilib buyurtma berish mumkin?",
                                a: "Saytimizda kerakli mahsulotni tanlang, 'Savatga qo'shish' tugmasini bosing va buyurtma formani to'ldiring. Operatorimiz siz bilan bog'lanadi."
                            },
                            {
                                q: "Promokodni qanday ishlatish mumkin?",
                                a: "Buyurtma rasmiylashtirish jarayonida maxsus maydonchaga promokodni kiritib, chegirmaga ega bo'lishingiz mumkin."
                            }
                        ].map((item, idx) => (
                            <details key={idx} className="group border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm open:shadow-md transition-all duration-300">
                                <summary className="flex items-center justify-between p-6 cursor-pointer list-none bg-white hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-open:bg-purple-600 group-open:text-white transition-colors">
                                            <HelpCircle size={20} />
                                        </div>
                                        <span className="font-bold text-gray-800 text-lg">{item.q}</span>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform duration-300" />
                                </summary>
                                <div className="p-6 pt-0 text-gray-600 leading-relaxed border-t border-transparent group-open:border-gray-100 animate-fade-in-up">
                                    {item.a}
                                </div>
                            </details>
                        ))}
                    </div>

                    <div className="mt-12 bg-gray-900 rounded-3xl p-8 text-center text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-4">Savolingizga javob topa olmadingizmi?</h3>
                            <p className="text-gray-400 mb-8">Bizning operatorlarimizga murojaat qiling, ular sizga yordam berishdan xursand bo'lishadi.</p>
                            <a href="https://t.me/hadafsupport" target="_blank" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-blue-600/50">
                                <MessageCircle size={20} />
                                Telegram orqali yozish
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
