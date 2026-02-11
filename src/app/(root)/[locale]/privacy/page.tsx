"use client";

import { Shield, Lock, FileText, Eye, ShieldCheck, Database, Share2, Bell, Smartphone, Server } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
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
                        Ma'lumotlar xavfsizligi kafolatlangan
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">Maxfiylik siyosati</h1>
                    <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        Sizning shaxsiy ma'lumotlaringiz daxlsizligi — HADAF Marketpleysi uchun eng oliy qadriyatdir.
                    </p>
                </motion.div>
            </div>

            <div className="container max-w-5xl -mt-12 relative z-10 px-4">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 p-8 md:p-14 border border-blue-50">

                    {/* Key Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        {[
                            { icon: Lock, title: "AES-256 Shifrlash", desc: "Bank darajasidagi himoya", color: "blue" },
                            { icon: Shield, title: "100% Maxfiylik", desc: "Ma'lumotlar sotilmaydi", color: "emerald" },
                            { icon: Database, title: "Xavfsiz Saqlash", desc: "Himoyalangan serverlar", color: "indigo" }
                        ].map((item, i) => (
                            <div key={i} className={`p-6 rounded-3xl bg-${item.color}-50/50 border border-${item.color}-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-500`}>
                                <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-${item.color}-600 mb-4 group-hover:bg-${item.color}-600 group-hover:text-white transition-colors`}>
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
                                    <FileText className="text-blue-600" /> 1. Umumiy qoidalar va Huquqiy asoslar
                                </h2>
                                <p>
                                    Mazkur Maxfiylik Siyosati (keyingi o'rinlarda — "Siyosat") <strong>HADAF Marketpleysi</strong> (keyingi o'rinlarda — "Platforma") tomonidan foydalanuvchilarning shaxsiy ma'lumotlarini to'plash, saqlash, qayta ishlash va himoya qilish tartibini belgilaydi.
                                </p>
                                <p>
                                    Ushbu hujjat O'zbekiston Respublikasining <strong>"Shaxsiy ma'lumotlar to'g'risida"gi</strong> Qonuni (O'RQ-547), "Elektron tijorat to'g'risida"gi va "Axborotlashtirish to'g'risida"gi qonunlari talablari asosida ishlab chiqilgan bo'lib, xalqaro ma'lumotlar himoyasi standartlariga to'liq muvofiq keladi.
                                </p>
                            </section>

                            <section className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                                <h2 className="text-2xl flex items-center gap-3 mb-6">
                                    <Smartphone className="text-blue-600" /> 2. Biz qanday ma'lumotlarni to'playmiz?
                                </h2>
                                <p>Platforma foydalanuvchilarga xizmat ko'rsatish jarayonida quyidagi toifadagi ma'lumotlarni yig'ishi mumkin:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <h4 className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-wide">Identifikatsiya ma'lumotlari</h4>
                                        <p className="text-xs m-0">F.I.O, telefon raqami, yetkazib berish manzili, elektron pochta manzili va shaxsiy kabinetga kirish uchun login.</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <h4 className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-wide">Texnik ma'lumotlar</h4>
                                        <p className="text-xs m-0">IP-manzil, brauzer turi va versiyasi, vaqt mintaqasi, operatsion tizim, qurilma modeli va ID raqami.</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <h4 className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-wide">Tranzaksiya ma'lumotlari</h4>
                                        <p className="text-xs m-0">Xaridlar tarixi, buyurtma holatlari, chegirmalar va to'lov usullari (bank karta raqamlari bizda saqlanmaydi).</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <h4 className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-wide">Foydalanish ma'lumotlari</h4>
                                        <p className="text-xs m-0">Qaysi mahsulotlarni ko'rganingiz, qidiruv so'rovlari va Platformadagi saqlangan sevimlilar ro'yxati.</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl flex items-center gap-3 mb-6">
                                    <Eye className="text-blue-600" /> 3. Ma'lumotlarni qayta ishlash maqsadlari
                                </h2>
                                <p>Biz to'plangan ma'lumotlardan faqat quyidagi qat'iy belgilangan maqsadlarda foydalanamiz:</p>
                                <ul className="list-none space-y-4 pl-0">
                                    {[
                                        "Bitimlarni amalga oshirish: Buyurtmalarni rasmiylashtirish, to'lovlarni qabul qilish va mahsulotlarni kuryerlar orqali manzilingizga yetkazish.",
                                        "Xavfsizlik: Firibgarlik harakatlarini oldini olish, akkauntlarni ruxsatsiz kirishdan himoya qilish va tizim barqarorligini ta'minlash.",
                                        "Xizmat sifatini yaxshilash: Platforma interfeysini foydalanuvchi qiziqishlariga moslashtirish va texnik xatoliklarni bartaraf etish.",
                                        "Kommunikatsiya: Buyurtma holati bo'yicha xabarnomalar yuborish va sizni qiziqtirgan savollarga javob berish."
                                    ].map((text, idx) => (
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
                                    <Server className="text-blue-400" /> 4. Ma'lumotlar xavfsizligi va Saqlash
                                </h2>
                                <div className="space-y-4 text-sm opacity-90 leading-relaxed">
                                    <p>
                                        HADAF Platformasi ma'lumotlarni himoyalash uchun ko'p bosqichli xavfsizlik tizimidan foydalanadi. Boshqaruv serverlarimiz O'zbekiston Respublikasi hududida joylashgan bo'lib, <strong>O'zR Qonunchiligining suverenitet talablariga</strong> to'liq javob beradi.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                            <p className="font-bold text-blue-300 m-0 text-xs mb-1">AES-256 Encryption</p>
                                            <p className="m-0 text-[11px]">Barcha shaxsiy ma'lumotlar dunyodagi eng kuchli shifrlash kalitlari bilan kodlangan.</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                            <p className="font-bold text-blue-300 m-0 text-xs mb-1">TLS 1.2 Protocol</p>
                                            <p className="m-0 text-[11px]">Brauzer va server o'rtasidagi aloqa shifrlangan TLS kanallari orqali amalga oshiriladi.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl flex items-center gap-3 mb-6">
                                    <Share2 className="text-blue-600" /> 5. Ma'lumotlarni uchinchi shaxslarga berish
                                </h2>
                                <p>
                                    Sizning ruxsatingizsiz biz hech qachon shaxsiy ma'lumotlaringizni reklama agentliklariga yoki boshqa tijoriy tashkilotlarga sotmaymiz. Ma'lumotlar faqat quyidagi cheklangan doirada ulashiladi:
                                </p>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start border-l-4 border-blue-600 pl-6 py-2">
                                        <p className="text-sm m-0"><strong>Logistika hamkorlari:</strong> Ism va manzilingiz buyurtmani yetkazuvchi kuryerlik xizmatiga beriladi.</p>
                                    </div>
                                    <div className="flex gap-4 items-start border-l-4 border-slate-300 pl-6 py-2">
                                        <p className="text-sm m-0"><strong>To'lov organlari:</strong> Tranzaksiyani xavfsiz bajarish uchun to'lov shlyuzlariga talab qilinadigan ma'lumotlar uzatiladi.</p>
                                    </div>
                                    <div className="flex gap-4 items-start border-l-4 border-slate-300 pl-6 py-2">
                                        <p className="text-sm m-0"><strong>Davlat organlari:</strong> O'zR qonunchiligida nazarda tutilgan holatlarda, rasmiy sud yoki huquq-tartibot organlari talabiga binoan.</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl flex items-center gap-3 mb-6">
                                    <ShieldCheck className="text-blue-600" /> 6. Foydalanuvchi huquqlari
                                </h2>
                                <p>Xaridor o'z shaxsiy ma'lumotlariga nisbatan quyidagi huquqlarga ega:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        "Ma'lumotlarni ko'rish va nusxa olish huquqi",
                                        "Noto'g'ri ma'lumotlarni tuzatish huquqi",
                                        "Ma'lumotlarni Platforma bazasidan o'chirish huquqi (Unitilish huquqi)",
                                        "Qayta ishlashni cheklash yoki marketing xabarlaridan voz kechish"
                                    ].map((text, i) => (
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
                            <h3 className="text-2xl md:text-3xl font-black">Savollaringiz yoki murojaatlaringiz bormi?</h3>
                            <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
                                Agar shaxsiy ma'lumotlaringizni o'chirish yoki himoya qilish bo'yicha qo'shimcha savollaringiz bo'lsa, mutaxassisimizga yozing.
                            </p>
                            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-8">
                                <a href="mailto:privacy@hadaf.uz" className="flex items-center gap-3 bg-[#0052FF] text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-[#0040CC] transition-all hover:scale-105 shadow-xl shadow-blue-600/20 uppercase tracking-widest">
                                    <Bell size={20} /> privacy@hadaf.uz
                                </a>
                                <a href="/uz/terms" className="flex items-center gap-3 bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-white/20 transition-all border border-white/10 uppercase tracking-widest">
                                    Ommaviy oferta
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
