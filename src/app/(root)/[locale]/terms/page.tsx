"use client";

import { useState } from 'react';
import { ShieldCheck, Scale, FileText, Lock, Truck, RefreshCcw, AlertTriangle, Gavel, ArrowRight, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const sections = [
    { id: 'general', title: 'Umumiy qoidalar', icon: FileText },
    { id: 'definitions', title: 'Atamalar va Ta\'riflar', icon: ShieldCheck },
    { id: 'intellectual', title: 'Intellektual mulk huquqi', icon: Lock },
    { id: 'payment', title: 'To\'lovlar va Moliyaviy xavfsizlik', icon: Scale },
    { id: 'delivery', title: 'Yetkazib berish va Qabul qilish', icon: Truck },
    { id: 'returns', title: 'Qaytarish va Kafolat shartlari', icon: RefreshCcw },
    { id: 'privacy', title: 'Maxfiylik va Ma\'lumotlar himoyasi', icon: ShieldCheck },
    { id: 'liability', title: 'Taraflarning javobgarligi', icon: AlertTriangle },
    { id: 'disputes', title: 'Nizolarni hal qilish tartibi', icon: Gavel },
];

export default function TermsPage() {
    const [activeSection, setActiveSection] = useState('general');
    const params = useParams();
    const locale = params?.locale || 'uz';

    const handleDownloadPDF = () => {
        window.print();
    };

    const renderContent = () => {
        switch (activeSection) {
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
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">Umumiy qoidalar</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>1.1. Shartnomaning huquqiy maqomi:</strong> Mazkur Ommaviy oferta (keyingi o'rinlarda — "Shartnoma") O'zbekiston Respublikasi Fuqarolik kodeksining 367-moddasiga muvofiq rasmiy taklif hisoblanadi. Shartnoma <strong>Surxondaryo viloyati, Termiz shahrida</strong> joylashgan "HADAF" savdo markasi (keyingi o'rinlarda — "Sotuvchi") va Marketpleys xizmatlaridan foydalanuvchi jismoniy yoki yuridik shaxslar (keyingi o'rinlarda — "Xaridor") o'rtasidagi masofaviy savdo-sotiq shartlarini belgilaydi.</p>
                                <p><strong>1.2. Amaldagi qonunchilik:</strong> Shartnoma O'zbekiston Respublikasining "Elektron tijorat to'g'risida"gi, "Iste'molchilarning huquqlarini himoya qilish to'g'risida"gi, "Axborotlashtirish to'g'risida"gi qonunlari va O'zR Vazirlar Mahkamasining "O'zbekiston Respublikasida chakana savdo qoidalarini tasdiqlash to'g'risida"gi qarori asosida tuzilgan.</p>
                                <p><strong>1.3. Aksept (Rozilik):</strong> Xaridor tomonidan Marketpleysda ro'yxatdan o'tish, shaxsiy ma'lumotlarni kiritish, buyurtmani shakllantirish yoki to'lovni amalga oshirish — ushbu Shartnoma shartlarini to'liq va so'zsiz qabul qilish (Aksept) hisoblanadi. Aksept amalga oshirilgandan so'ng, Shartnoma yozma shaklda tuzilgan shartnoma bilan teng yuridik kuchga ega bo'ladi.</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-7 text-white text-xs space-y-3 shadow-xl shadow-blue-600/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Scale size={80} />
                                </div>
                                <p className="font-black text-sm uppercase tracking-wider">1.4. Shartnoma qamrovi:</p>
                                <p className="leading-relaxed font-medium">Mazkur Shartnoma HADAF.uz sayti va uning mobil ilovalari orqali namoyish etiladigan barcha tovarlar va xizmatlarga nisbatan qo'llaniladi. Xaridor xaridni amalga oshirishdan oldin Shartnoma tahriri bilan tanishib chiqishi shart. Sotuvchi shartlarni istalgan vaqtda yakka tartibda o'zgartirishi mumkin.</p>
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
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">Atamalar va Ta'riflar</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    t: "Marketpleys",
                                    d: "HADAF.uz domeni va mobil ilovalari orqali faoliyat yurituvchi, Mahsulotlar katalogini o'z ichiga olgan, Sotuvchi hamda Xaridor o'rtasida elektron bitimlarni tashkil etuvchi axborot tizimi.",
                                    icon: FileText
                                },
                                {
                                    t: "Xaridor",
                                    d: "Marketpleys orqali shaxsiy, oilaviy yoki boshqa tadbirkorlik bilan bog'liq bo'lmagan maqsadlarda Mahsulot buyurtma qiluvchi muomalaga layoqatli jismoniy yoki yuridik shaxs.",
                                    icon: CheckCircle2
                                },
                                {
                                    t: "Mahsulot",
                                    d: "Sotuvchi tomonidan Marketpleysda sotish uchun taqdim etilgan, tavsifi, surati va narxi ko'rsatilgan har qanday moddiy buyum yoki tovarlar majmuasi.",
                                    icon: ShieldCheck
                                },
                                {
                                    t: "Logistika Operatori",
                                    d: "Mahsulotni Sotuvchi omboridan qabul qilib, belgilangan manzil bo'yicha Xaridorga yetkazib beruvchi professional kuryerlik yoki transport tashkiloti.",
                                    icon: Truck
                                },
                                {
                                    t: "Shaxsiy kabinet",
                                    d: "Xaridorning identifikatsiya ma'lumotlari, buyurtmalar tarixi va to'lov holatlarini boshqarish uchun mo'ljallangan Marketpleysdagi shaxsiy sahifasi.",
                                    icon: Lock
                                }
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
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">Intellektual mulk huquqi</h2>
                        </div>
                        <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden space-y-6 shadow-2xl">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full -mr-40 -mt-40 blur-3xl"></div>
                            <div className="relative z-10 space-y-5 text-sm leading-relaxed">
                                <p><strong>3.1. Havolalar va Kontent:</strong> Marketpleysda joylashtirilgan barcha intellektual mulk obyektlari, jumladan—matnlar, grafik tasvirlar, illyustratsiyalar, video lavhalar, logotiplar, tovar belgilari hamda dasturiy ta'minot "HADAF"ning eksklyuziv mulki hisoblanadi.</p>
                                <p><strong>3.2. Ruxsatsiz foydalanish:</strong> Marketpleys tarkibidagi har qanday ma'lumotni Sotuvchining rasmiy yozma roziligisiz ko'chirib olish, chop etish, o'zgartirish yoki boshqa internet resurslariga joylashtirish qat'iyan man etiladi.</p>
                                <p><strong>3.3. Texnik cheklovlar:</strong> Marketpleys tizimiga avtomatlashtirilgan vositalar (botlar, skreperlar, parserlar) yordamida kirish va ma'lumotlarni yig'ish tizim xavfsizligini buzish deb baholanadi.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-orange-400 font-bold text-xs flex items-center gap-4">
                                <AlertTriangle size={24} className="shrink-0" />
                                <p className="m-0 leading-relaxed uppercase tracking-tighter italic">Huquqlar buzilgan taqdirda, Sotuvchi O'zR Fuqarolik va Ma'muriy javobgarlik kodekslari asosida ko'rilgan zararni sud tartibida undirish huquqini saqlab qoladi.</p>
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
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">To'lovlar va Xavfsizlik</h2>
                        </div>
                        <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>4.1. Narxlar siyosati:</strong> Mahsulotlar narxi Marketpleysda milliy valyuta (so'm)da belgilanadi. Ko'rsatilgan narxlarga QQS va boshqa majburiy to'lovlar (agar alohida ko'rsatilmagan bo'lsa) kiritilgan.</p>
                                <p><strong>4.2. To'lov tizimlari:</strong> Xaridor buyurtma uchun to'lovni Marketpleysda integratsiya qilingan onlayn to'lov tizimlari (Uzcard, Humo, Payme, Click) yoki mahsulotni topshirib olish vaqtida (naqd yoki terminal) amalga oshirishi mumkin.</p>
                                <p><strong>4.3. Moliyaviy xavfsizlik:</strong> Onlayn to'lovlarni amalga oshirishda karta ma'lumotlari shifrlangan TLS 1.2 kanallari orqali uzatiladi. HADAF o'z serverlarida bank karta ma'lumotlarini (PIN-kod, CVV) saqlamaydi, barcha harakatlar to'lov shlyuzi orqali himoyalanadi.</p>
                                <p><strong>4.4. To'lovni qaytarish:</strong> Buyurtma bekor qilinganda yoki mahsulot qaytarilganda, mablag'lar Xaridorning bank kartasiga bankning ichki qoidalariga asosan 3 dan 10 ish kunigacha bo'lgan muddatda qaytariladi.</p>
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
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">Yetkazib berish va Qabul qilish</h2>
                        </div>
                        <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4">
                                <p><strong>5.1. Logistika markazi:</strong> HADAF markazi <strong>Surxondaryo viloyati, Termiz shahrida</strong> joylashgan. Termiz shahri ichida mahsulotlar 2-6 soat ichida (shoshilinch holatlarda) yetkazib beriladi.</p>
                                <p><strong>5.2. Geografiya va Muddatlar:</strong> Buyurtmalar butun Respublika bo'ylab yetkaziladi. Toshkent shahri va viloyat markazlariga 24-48 soat, chekka tumanlarga 72-120 soat oralig'ida yetkazilishi kafolatlanadi.</p>
                                <p><strong>5.3. Xaridor majburiyati:</strong> Mahsulotni qabul qilish paytida Xaridor kuryer huzurida: 1) mahsulot nomi; 2) soni; 3) tashqi ko'rinishi va qadog'ining butunligini tekshirishi shart.</p>
                                <p><strong>5.4. Kuryerni kutishi:</strong> Kuryer manzilga yetib kelgach, Xaridorni 15 daqiqa davomida kutishi shart. Agar ushbu vaqt ichida Xaridor bilan bog'lanish imkoni bo'lmasa, buyurtma bekor qilinadi.</p>
                            </div>
                            <div className="bg-blue-600 rounded-3xl p-8 text-white flex items-start gap-6 shadow-xl relative overflow-hidden group">
                                <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <Truck size={150} />
                                </div>
                                <div className="relative z-10 space-y-2">
                                    <p className="font-black text-base italic uppercase">Muhim eslatma:</p>
                                    <p className="text-xs opacity-90 leading-relaxed font-medium">Mahsulotni topshirish-qabul qilish hujjatlari imzolangandan so'ng, mexanik shikastlanishlar yoki butunligi yuzasidan e'tirozlar qabul qilinmaydi.</p>
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
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">Qaytarish va Kafolat shartlari</h2>
                        </div>
                        <div className="space-y-5 text-slate-600 text-sm leading-relaxed font-medium">
                            <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white border-2 border-red-500/20 shadow-xl space-y-5">
                                <h4 className="text-lg font-black flex items-center gap-3 text-red-500 uppercase tracking-tight">
                                    <RefreshCcw size={24} /> Qaytarilmaydigan mahsulotlar ro'yxati
                                </h4>
                                <p className="text-xs opacity-60 italic border-l-2 border-red-500 pl-4">O'zbekiston Respublikasi Vazirlar Mahkamasining 75-sonli qaroriga ko'ra, quyidagi mahsulotlar sifati buzilmagan taqdirda qaytarib olinmaydi:</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {["Shaxsiy gigiyena", "Parfumeriya & Kosmetika", "Zargarlik buyumlari", "Ichki kiyimlar", "Murakkab maishiy texnika", "Dori vositalari", "Kitoblar va gazetalar", "Mebel jihozlari", "Ehtiyot qismlar"].map((t, i) => (
                                        <div key={i} className="px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black text-center uppercase tracking-tighter hover:bg-red-500/10 transition-colors">{t}</div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>6.1. Sifatli mahsulotni qaytarish:</strong> Xaridor mahsulotni olgan kundan boshlab 10 kalendar kuni ichida qaytarishi mumkin. Bunda mahsulot ishlatilmagan, tovar ko'rinishi, qadoqlari va barcha zavod yorliqlari butun bo'lishi lozim.</p>
                                <p><strong>6.2. Sifatsiz (nuqsonli) mahsulot:</strong> Zavod nuqsoni aniqlangan taqdirda, mahsulot mutaxassis xulosasi asosida bepul ta'mirlanadi yoki unga o'xshash bo'lgan sifatli mahsulotga almashtiriladi.</p>
                                <p><strong>6.3. Transport haqi:</strong> Sifatli mahsulot asossiz qaytarilganda, yetkazib berish xizmati qoplanmaydi. Sifatsiz mahsulotlarni qaytarish va almashtirish kuryerlik xarajatlari Sotuvchi zimmasida bo'ladi.</p>
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
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">Maxfiylik siyosati va Ma'lumotlar himoyasi</h2>
                        </div>
                        <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>7.1. Umumiy qoidalar:</strong> HADAF Marketpleysi (keyingi o'rinlarda — "Platforma") foydalanuvchilarning shaxsiy ma'lumotlarini O'zbekiston Respublikasining "Shaxsiy ma'lumotlar to'g'risida"gi Qonuniga muvofiq qayta ishlaydi. Platformadan foydalanish Xaridorning o'z ma'lumotlarini qayta ishlashga roziligini anglatadi.</p>
                                <p><strong>7.2. To'planadigan ma'lumotlar:</strong> Biz quyidagi ma'lumotlarni to'playmiz: 1) Identifikatsiya ma'lumotlari (F.I.O, telefon raqami); 2) Yetkazib berish manzili; 3) IP-manzil va kuki (cookies) fayllari; 4) Xaridlar va to'lovlar tarixi. To'lov karta ma'lumotlari Platforma serverlarida saqlanmaydi.</p>
                                <p><strong>7.3. Foydalanish maqsadlari:</strong> Ma'lumotlar faqat quyidagi maqsadlarda ishlatiladi: buyurtmalarni rasmiylashtirish va yetkazish; Platforma faoliyatini optimallashtirsh; firibgarlikka qarshi kurash; Xaridorga yangiliklar va maxsus takliflar yuborish (rozilik mavjud bo'lsa).</p>
                                <p><strong>7.4. Ma'lumotlarni saqlash va himoya qilish:</strong> Barcha ma'lumotlar shifrlangan serverlarda saqlanadi. Platforma bank darajasidagi AES-256 va TLS 1.2 shifrlash protokollaridan foydalanadi. Ma'lumotlarga kirish huquqi faqat maxsus vakolatli administratorlarga berilgan.</p>
                                <p><strong>7.5. Uchinchi shaxslarga berish:</strong> Shaxsiy ma'lumotlar uchinchi shaxslarga faqat quyidagi holatlarda berilishi mumkin: 1) Kuryerlik xizmatiga buyurtmani yetkazish uchun; 2) To'lov tizimlariga tranzaksiyani tasdiqlash uchun; 3) O'zbekiston Respublikasi qonunchiligida nazarda tutilgan huquqni muhofaza qiluvchi organlarning rasmiy talabiga binoan.</p>
                                <p><strong>7.6. Xaridorning huquqlari:</strong> Xaridor o'z ma'lumotlarini o'zgartirish, Platformadan o'chirishni talab qilish yoki marketing xabarlaridan voz kechish huquqiga ega. Buning uchun Platforma qo'llab-quvvatlash xizmati bilan bog'lanish kifoya.</p>
                            </div>
                            <div className="p-10 rounded-[2.5rem] bg-emerald-900 text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-emerald-900/10">
                                <ShieldCheck size={60} className="shrink-0 text-emerald-400 opacity-80" />
                                <div className="space-y-2">
                                    <p className="m-0 text-base font-black uppercase tracking-widest tracking-tighter">Xalqaro xavfsizlik standarti</p>
                                    <p className="m-0 text-xs opacity-70 leading-relaxed font-medium">Barcha shaxsiy ma'lumotlar va serverlararo aloqalar xalqaro bank darajasidagi AES-256 shifrlash protokoli bilan himoyalangan. Biz sizning ma'lumotlaringiz maxfiyligi uchun to'liq javobgarlikni o'z zimmamizga olamiz.</p>
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
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">Taraflarning javobgarligi</h2>
                        </div>
                        <div className="bg-red-50/30 border-2 border-red-100/50 rounded-[2.5rem] p-9 space-y-6 text-sm text-slate-700 leading-relaxed font-medium">
                            <div className="space-y-4">
                                <p><strong>8.1. Sotuvchining mas'uliyati:</strong> Sotuvchi mahsulot tavsifining haqqoniyligi va yetkazib berish muddatlarining amal qilishi uchun mas'uldir. Ammo Fors-major holatlari (tabiiy ofat, epidemiya) yuz berganda javobgarlik bo'lmaydi.</p>
                                <p><strong>8.2. Xaridorning mas'uliyati:</strong> Xaridor tomonidan taqdim etilgan noto'g'ri bog'lanish ma'lumotlari tufayli xarid kechikishi yoki yetkazilmasligi uchun barcha moddiy zarar Xaridor zimmasida qoladi.</p>
                                <p><strong>8.3. Texnik nosozliklar:</strong> Platformaning texnik yangilanishi yoki serverlardagi nosozliklar tufayli yuzaga keladigan vaqtinchalik uzilishlar uchun Sotuvchi javobgar emas.</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-white border border-red-100 text-xs italic opacity-80 shadow-sm">
                                "Sotuvchi bilvosita zararlar, ya'ni foyda ko'rolmaslik yoki ma'naviy yo'qotishlar uchun moddiy kompensatsiya to'lamaydi."
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
                            <h2 className="text-2xl font-black text-slate-900 m-0 tracking-tight">Nizolarni hal qilish tartibi</h2>
                        </div>
                        <div className="space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
                            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl border border-slate-100 border-t-8 border-indigo-600 space-y-5">
                                <h4 className="text-indigo-600 font-extrabold text-lg flex items-center gap-3">
                                    <Gavel size={24} /> 9.1. Pretensiya (Yozma murojaat) tartibi
                                </h4>
                                <p className="m-0 text-slate-700 leading-relaxed">Shartnoma bo'yicha yuzaga kelgan barcha nizoli vaziyatlar birinchi navbatda majburiy tartibda pretensiya yo'li bilan hal qilinishi shart. Xaridor o'z e'tirozini yozma shaklda Sotuvchining rasmiy manziliga jo'natishi lozim. Murojaat muddati: 15 ish kuni.</p>
                            </div>
                            <div className="p-7 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 shadow-sm">
                                <p><strong>9.2. Sud vakolati:</strong> Agar muzokaralar orqali kelishuvga erishilmasa, nizo O'zbekiston Respublikasining amaldagi qonunchiligi asosida <strong>Termiz shahridagi vakolatli iqtisodiy yoki fuqarolik sudida</strong> (da'vo turiga asosan) ko'rib chiqiladi.</p>
                                <p><strong>9.3. Qo'shimcha qoida:</strong> Sotuvchi xalqaro arbitraj yoki chet el sudlarining qarorlarini, agar ular O'zbekiston Respublikasi qonunchiligiga zid kelsa, tan olmaslik huquqini saqlab qoladi.</p>
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
                            {(() => {
                                switch (section.id) {
                                    case 'general':
                                        return (
                                            <div className="space-y-4 text-slate-700 text-sm leading-relaxed">
                                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                                                    <p><strong>1.1. Shartnomaning huquqiy maqomi:</strong> Mazkur Ommaviy oferta (keyingi o'rinlarda — "Shartnoma") O'zbekiston Respublikasi Fuqarolik kodeksining 367-moddasiga muvofiq rasmiy taklif hisoblanadi. Shartnoma <strong>Surxondaryo viloyati, Termiz shahrida</strong> joylashgan "HADAF" savdo markasi (keyingi o'rinlarda — "Sotuvchi") va Marketpleys xizmatlaridan foydalanuvchi jismoniy yoki yuridik shaxslar (keyingi o'rinlarda — "Xaridor") o'rtasidagi masofaviy savdo-sotiq shartlarini belgilaydi.</p>
                                                    <p><strong>1.2. Amaldagi qonunchilik:</strong> Shartnoma O'zbekiston Respublikasining "Elektron tijorat to'g'risida"gi, "Iste'molchilarning huquqlarini himoya qilish to'g'risida"gi, "Axborotlashtirish to'g'risida"gi qonunlari va O'zR Vazirlar Mahkamasining "O'zbekiston Respublikasida chakana savdo qoidalarini tasdiqlash to'g'risida"gi qarori asosida tuzilgan.</p>
                                                    <p><strong>1.3. Aksept (Rozilik):</strong> Xaridor tomonidan Marketpleysda ro'yxatdan o'tish, shaxsiy ma'lumotlarni kiritish, buyurtmani shakllantirish yoki to'lovni amalga oshirish — ushbu Shartnoma shartlarini to'liq va so'zsiz qabul qilish (Aksept) hisoblanadi. Aksept amalga oshirilgandan so'ng, Shartnoma yozma shaklda tuzilgan shartnoma bilan teng yuridik kuchga ega bo'ladi.</p>
                                                </div>
                                                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                                                    <p><strong>1.4. Shartnoma qamrovi:</strong> Mazkur Shartnoma HADAF.uz sayti va uning mobil ilovalari orqali namoyish etiladigan barcha tovarlar va xizmatlarga nisbatan qo'llaniladi. Xaridor xaridni amalga oshirishdan oldin Shartnoma tahriri bilan tanishib chiqishi shart. Sotuvchi shartlarni istalgan vaqtda yakka tartibda o'zgartirishi mumkin.</p>
                                                </div>
                                            </div>
                                        );
                                    case 'definitions':
                                        return (
                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    { t: "Marketpleys", d: "HADAF.uz domeni va mobil ilovalari orqali faoliyat yurituvchi, Mahsulotlar katalogini o'z ichiga olgan, Sotuvchi hamda Xaridor o'rtasida elektron bitimlarni tashkil etuvchi axborot tizimi." },
                                                    { t: "Xaridor", d: "Marketpleys orqali shaxsiy, oilaviy yoki boshqa tadbirkorlik bilan bog'liq bo'lmagan maqsadlarda Mahsulot buyurtma qiluvchi muomalaga layoqatli jismoniy yoki yuridik shaxs." },
                                                    { t: "Mahsulot", d: "Sotuvchi tomonidan Marketpleysda sotish uchun taqdim etilgan, tavsifi, surati va narxi ko'rsatilgan har qanday moddiy buyum yoki tovarlar majmuasi." },
                                                    { t: "Logistika Operatori", d: "Mahsulotni Sotuvchi omboridan qabul qilib, belgilangan manzil bo'yicha Xaridorga yetkazib beruvchi professional kuryerlik yoki transport tashkiloti." },
                                                    { t: "Shaxsiy kabinet", d: "Xaridorning identifikatsiya ma'lumotlari, buyurtmalar tarixi va to'lov holatlarini boshqarish uchun mo'ljallangan Marketpleysdagi shaxsiy sahifasi." }
                                                ].map((item, i) => (
                                                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                        <p className="m-0 text-sm"><strong>{item.t}:</strong> {item.d}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    case 'intellectual':
                                        return (
                                            <div className="space-y-4 text-slate-700 text-sm">
                                                <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4">
                                                    <p><strong>3.1. Havolalar va Kontent:</strong> Marketpleysda joylashtirilgan barcha intellektual mulk obyektlari, jumladan—matnlar, grafik tasvirlar, illyustratsiyalar, video lavhalar, logotiplar, tovar belgilari hamda dasturiy ta'minot "HADAF"ning eksklyuziv mulki hisoblanadi.</p>
                                                    <p><strong>3.2. Ruxsatsiz foydalanish:</strong> Marketpleys tarkibidagi har qanday ma'lumotni Sotuvchining rasmiy yozma roziligisiz ko'chirib olish, chop etish, o'zgartirish yoki boshqa internet resurslariga joylashtirish qat'iyan man etiladi.</p>
                                                    <p><strong>3.3. Texnik cheklovlar:</strong> Marketpleys tizimiga avtomatlashtirilgan vositalar (botlar, skreperlar, parserlar) yordamida kirish va ma'lumotlarni yig'ish tizim xavfsizligini buzish deb baholanadi.</p>
                                                </div>
                                            </div>
                                        );
                                    case 'payment':
                                        return (
                                            <div className="space-y-4 text-slate-700 text-sm">
                                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                                                    <p><strong>4.1. Narxlar siyosati:</strong> Mahsulotlar narxi Marketpleysda milliy valyuta (so'm)da belgilanadi. Ko'rsatilgan narxlarga QQS va boshqa majburiy to'lovlar kiritilgan.</p>
                                                    <p><strong>4.2. To'lov tizimlari:</strong> Xaridor buyurtma uchun to'lovni Marketpleysda integratsiya qilingan onlayn to'lov tizimlari (Uzcard, Humo, Payme, Click) yoki mahsulotni topshirib olish vaqtida (naqd yoki terminal) amalga oshirishi mumkin.</p>
                                                    <p><strong>4.3. Moliyaviy xavfsizlik:</strong> Onlayn to'lovlarni amalga oshirishda karta ma'lumotlari shifrlangan TLS 1.2 kanallari orqali uzatiladi. HADAF o'z serverlarida bank karta ma'lumotlarini (PIN-kod, CVV) saqlamaydi.</p>
                                                    <p><strong>4.4. To'lovni qaytarish:</strong> Buyurtma bekor qilinganda yoki mahsulot qaytarilganda, mablag'lar Xaridorning bank kartasiga 3 dan 10 ish kunigacha bo'lgan muddatda qaytariladi.</p>
                                                </div>
                                            </div>
                                        );
                                    case 'delivery':
                                        return (
                                            <div className="space-y-4 text-slate-700 text-sm">
                                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                                                    <p><strong>5.1. Logistika markazi:</strong> HADAF markazi <strong>Surxondaryo viloyati, Termiz shahrida</strong> joylashgan. Termiz shahri ichida mahsulotlar 2-6 soat ichida yetkazib beriladi.</p>
                                                    <p><strong>5.2. Geografiya va Muddatlar:</strong> Toshkent shahri va viloyat markazlariga 24-48 soat, chekka tumanlarga 72-120 soat oralig'ida yetkazilishi kafolatlanadi.</p>
                                                    <p><strong>5.3. Xaridor majburiyati:</strong> Mahsulotni qabul qilish paytida Xaridor kuryer huzurida: mahsulot nomi, soni va tashqi ko'rinishini tekshirishi shart.</p>
                                                    <p><strong>5.4. Kuryerni kutishi:</strong> Kuryer manzilga yetib kelgach, Xaridorni 15 daqiqa davomida kutishi shart.</p>
                                                </div>
                                            </div>
                                        );
                                    case 'returns':
                                        return (
                                            <div className="space-y-4 text-slate-700 text-sm">
                                                <div className="p-6 rounded-3xl bg-red-50 border border-red-100 space-y-3">
                                                    <p className="font-bold text-red-600 uppercase text-xs">Qaytarilmaydigan mahsulotlar ro'yxati (VM-75):</p>
                                                    <p className="text-xs italic">Shaxsiy gigiyena, parfumeriya, kosmetika, zargarlik buyumlari, ichki kiyimlar, dori vositalari, kitoblar, mebel jihozlari va murakkab maishiy texnikalar sifati buzilmagan taqdirda qaytarilmaydi.</p>
                                                </div>
                                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                                                    <p><strong>6.1. Sifatli mahsulotni qaytarish:</strong> Xaridor 10 kalendar kuni ichida qaytarishi mumkin (ishlatilmagan va qadoqlari butun bo'lsa).</p>
                                                    <p><strong>6.2. Sifatsiz (nuqsonli) mahsulot:</strong> Mutaxassis xulosasi asosida bepul ta'mirlanadi yoki o'xshash sifatli mahsulotga almashtiriladi.</p>
                                                    <p><strong>6.3. Transport haqi:</strong> Sifatsiz mahsulotlarni qaytarish kuryerlik xarajatlari Sotuvchi zimmasida bo'ladi.</p>
                                                </div>
                                            </div>
                                        );
                                    case 'privacy':
                                        return (
                                            <div className="space-y-4 text-slate-700 text-sm">
                                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                                                    <p><strong>7.1. Huquqiy asos:</strong> Shaxsiy ma'lumotlar O'zbekiston Respublikasining "Shaxsiy ma'lumotlar to'g'risida"gi Qonuni asosida qayta ishlanadi.</p>
                                                    <p><strong>7.2. Ma'lumotlar tarkibi:</strong> F.I.O, telefon raqami, manzil, kuki (cookies) va tranzaksiyalar tarixi to'planadi.</p>
                                                    <p><strong>7.3. Maqsad:</strong> Ma'lumotlar buyurtmani yetkazish, mijozlar bilan aloqa va xizmat sifatini yaxshilash uchun xizmat qiladi.</p>
                                                    <p><strong>7.4. Xavfsizlik:</strong> Ma'lumotlar AES-256 bitli shifrlash va TLS 1.2 protokollari yordamida uchinchi shaxslardan himoyalanadi.</p>
                                                    <p><strong>7.5. O'chirish:</strong> Xaridor istalgan vaqtda o'z shaxsiy ma'lumotlarini Platforma bazasidan o'chirishni talab qilish huquqiga ega.</p>
                                                </div>
                                            </div>
                                        );
                                    case 'liability':
                                        return (
                                            <div className="space-y-4 text-slate-700 text-sm">
                                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                                                    <p><strong>8.1. Sotuvchi mas'uliyati:</strong> Tavsif aniqligi va muddatlarga rioya etish uchun javobgar. Fors-major holatlari bundan mustasno.</p>
                                                    <p><strong>8.2. Xaridor mas'uliyati:</strong> Noto'g'ri manzil ko'rsatilgani sababli xarid kechikishi uchun barcha moddiy zarar Xaridor zimmasida qoladi.</p>
                                                </div>
                                            </div>
                                        );
                                    case 'disputes':
                                        return (
                                            <div className="space-y-4 text-slate-700 text-sm">
                                                <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 space-y-3">
                                                    <p><strong>9.1. Pretensiya:</strong> Nizolar birinchi navbatda majburiy tartibda yozma pretensiya yo'li bilan hal etiladi (15 ish kuni).</p>
                                                    <p><strong>9.2. Sud:</strong> Kelishuv bo'lmasa, nizo <strong>Termiz shahridagi vakolatli sudda</strong> ko'rib chiqiladi.</p>
                                                </div>
                                            </div>
                                        );
                                    default:
                                        return null;
                                }
                            })()}
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
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">Ommaviy Oferta</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">HADAF.UZ • Hujjat V4.1.2</p>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-slate-900">TERMIZ, O'ZBEKISTON</p>
                        <p className="text-slate-500 text-xs">12-FEVRAL, 2026</p>
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
                        Ommaviy <span className="text-blue-500">oferta</span>
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
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-4">Mundarija</h3>
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
                                        Keyingi bo'lim <ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                        className="ml-auto px-10 py-5 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all"
                                    >
                                        Hujjat yakunlandi
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
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] leading-none">Hujjat nazorati</p>
                                        <p className="text-[12px] text-slate-800 font-extrabold tracking-tighter">HADAF LEGAL FRAMEWORK V4.1.2</p>
                                    </div>
                                </div>
                                <div className="text-center md:text-right space-y-1">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Oxirgi tahrir</p>
                                    <p className="text-[11px] text-slate-900 font-black italic tracking-tight underline decoration-blue-500/30">12-FEVRAL, 2026 • TERMIZ</p>
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
                                    <span className="font-black text-slate-900 text-lg tracking-tight">Maxfiylik siyosati</span>
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
                                    <span className="font-black text-slate-900 text-lg tracking-tight">PDF Hujjatni yuklash</span>
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
