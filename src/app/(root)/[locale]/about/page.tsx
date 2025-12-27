"use client";

import {
    Users, Award, ShieldCheck, Zap, MapPin, TrendingUp, Leaf, BookOpen,
    Smile, ShoppingBag, Calendar, Truck, CheckCircle, Target, ArrowRight
} from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            {/* 1. Hero Section with Gradient */}
            <div className="relative bg-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-90"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                <div className="container relative z-10 pt-16 pb-32 md:pt-32 md:pb-64 text-center text-white">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/20 mb-6 animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        <span className="text-sm font-medium">O'zbekistonning yangi avlod marketpleysi</span>
                    </div>
                    <h1 className="text-4xl md:text-7xl font-extrabold mb-6 md:mb-8 tracking-tight leading-tight">
                        Sifat va Ishonch <br /> <span className="text-blue-200">Birlashgan Makon</span>
                    </h1>
                    <p className="text-lg md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed font-light px-4">
                        HADAF — bu shunchaki do'kon emas. Bu Surxondaryo va butun O'zbekiston aholisi uchun
                        qulaylik, tezkorlik va halollik standartlarini belgilovchi zamonaviy platforma.
                    </p>
                </div>
                {/* Wave divider */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto text-slate-50 fill-current">
                        <path fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                </div>
            </div>

            {/* 2. Mission & Vission (Split Layout) */}
            <div className="container py-12 md:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
                    <div className="space-y-6 md:space-y-8">
                        <div>
                            <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-2">Bizning vazifamiz</h2>
                            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
                                Texnologiyalar orqali <br /> hayot sifatini yaxshilash
                            </h3>
                            <div className="w-20 h-1 bg-blue-600 rounded-full"></div>
                        </div>
                        <p className="text-base md:text-lg text-gray-600 leading-relaxed text-justify">
                            Bizning asosiy maqsadimiz — Surxondaryo viloyatining har bir xonadoniga sifatli mahsulotlarni yetkazib berish.
                            Bozorma-bozor yurib vaqt sarflashga hojat yo'q. Biz eng so'nggi texnologiyalar va innovatsion logistika tizimi orqali
                            xaridlarni oson va yoqimli jarayonga aylantiramiz.
                        </p>

                        <div className="space-y-4">
                            {[
                                "Aholining raqamli savodxonligini oshirish",
                                "Tumanlar bo'ylab keng assortimentni ta'minlash",
                                "Yoshlarni zamonaviy elektron tijoratga jalb qilish"
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Target size={20} />
                                    </div>
                                    <span className="font-semibold text-gray-800 text-sm md:text-base">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Visual Side (Composition) */}
                    <div className="relative mt-8 lg:mt-0">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-[2rem] transform rotate-3"></div>
                        <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 p-6 md:p-8">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full"></div>
                            <div className="space-y-6 md:space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-green-100 text-green-600 rounded-2xl shrink-0">
                                        <Truck size={28} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">Tezkor Logistika</h4>
                                        <p className="text-sm text-gray-500">Termiz shahri bo'ylab 24 soat ichida, tumanlarga esa 2-3 kun ichida yetkazamiz.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl shrink-0">
                                        <ShieldCheck size={28} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">100% Kafolat</h4>
                                        <p className="text-sm text-gray-500">Har bir mahsulot rasmiy kafolatga ega va qat'iy sifat nazoratidan o'tadi.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl shrink-0">
                                        <Users size={28} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">Mijozlarni Qo'llab-quvvatlash</h4>
                                        <p className="text-sm text-gray-500">Haftaning 7 kuni davomida sizning savollaringizga javob berishga tayyormiz.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Stats Section (Dark Modern) */}
            <div className="bg-gray-900 py-12 md:py-20 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                <div className="container relative z-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                        {[
                            { value: "5+", label: "Yillik Tajriba" },
                            { value: "50K+", label: "Mamnun Mijozlar" },
                            { value: "10K+", label: "Mahsulot Turlari" },
                            { value: "24/7", label: "Qo'llab-quvvatlash" },
                        ].map((stat, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-2 group-hover:scale-110 transition-transform duration-300">
                                    {stat.value}
                                </div>
                                <div className="text-gray-400 font-medium tracking-wide uppercase text-xs md:text-sm border-t border-gray-800 pt-4 mt-2 inline-block px-4">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Values Grid (Bento Style) */}
            <div className="container py-16 md:py-24">
                <div className="text-center mb-10 md:mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Bizning Qadriyatlarimiz</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto px-4">Biznesimizning asosi — halollik va mijozlarga sadoqat</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Big Card 1 */}
                    <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 md:p-10 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500">
                            <Users size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-4">Mijoz — bizning mehmonimiz</h3>
                            <p className="text-blue-100 text-base md:text-lg leading-relaxed max-w-lg">
                                Biz uchun har bir xaridor shunchaki mijoz emas, balki qadrli mehmondir.
                                Biz har bir murojaatga individual yondashamiz va muammolarni xaridor foydasiga hal qilishga intilamiz.
                            </p>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-center hover:transform hover:-translate-y-1 transition-all">
                        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6">
                            <Award size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Oliy Sifat</h3>
                        <p className="text-gray-600 text-sm md:text-base">Biz faqat original va sertifikatlangan mahsulotlarni sotamiz. Qalbaki mahsulotlarga o'rin yo'q.</p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-center hover:transform hover:-translate-y-1 transition-all">
                        <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                            <Zap size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Innovatsiya</h3>
                        <p className="text-gray-600 text-sm md:text-base">Doimiy rivojlanish va yangiliklarga intilish — bizning hayot tarzimiz. Eng so'nggi gadjetlar bizda.</p>
                    </div>

                    {/* Big Card 4 */}
                    <div className="md:col-span-2 bg-slate-100 rounded-3xl p-6 md:p-10 text-gray-900 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-50"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold mb-4">Shaffoflik va Ochiqlik</h3>
                                <p className="text-gray-600 text-base md:text-lg leading-relaxed">
                                    Narxlarimiz qat'iy, to'lovlarimiz shaffof. Hech qanday yashirin to'lovlar yo'q.
                                    Biz hamkorlarimiz va mijozlarimiz bilan ochiq muloqotga doim tayyormiz.
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm hidden md:block">
                                <BookOpen size={48} className="text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. Team Section */}
            <div className="bg-white py-16 md:py-24 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                <div className="container px-4 relative z-10">
                    <div className="text-center mb-10 md:mb-16">
                        <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">Bizning Jamoa</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3 mb-6">Asoschilar va Boshqaruvchilar</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {[
                            { name: "Asadbek Davronov", role: "Asoschi", img: "/team/asadbek.jpg" },
                            { name: "Jasur Rahmonov", role: "Texnik Direktor", img: "https://ui-avatars.com/api/?name=Jasur+Rahmonov&background=00A4E4&color=fff&size=200" },
                            { name: "Madina Karimova", role: "Marketing Direktori", img: "https://ui-avatars.com/api/?name=Madina+Karimova&background=00A4E4&color=fff&size=200" },
                            { name: "Sardor Alimov", role: "Operatsion Direktor", img: "https://ui-avatars.com/api/?name=Sardor+Alimov&background=00A4E4&color=fff&size=200" },
                        ].map((member, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-[2.5rem] p-6 md:p-8 text-center hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group border border-transparent hover:border-1 hover:border-gray-100">
                                <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 md:mb-8 rounded-full p-1 bg-white shadow-lg group-hover:shadow-blue-200/50 transition-shadow">
                                    <img src={member.img} alt={member.name} className="w-full h-full rounded-full object-cover object-top" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{member.name}</h3>
                                <p className="text-blue-500 font-semibold text-sm md:text-base">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 6. History Timeline */}
            <div className="bg-slate-50 py-16 md:py-24 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

                <div className="container relative z-10">
                    <div className="text-center mb-12 md:mb-20">
                        <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">Bizning yo'limiz</span>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mt-3 mb-6">Rivojlanish Tarixi</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto text-base md:text-lg px-4">
                            Kichik g'oyadan boshlab, Surxondaryoning eng yirik marketpleysiga aylanishgacha bo'lgan davr.
                        </p>
                    </div>

                    <div className="relative max-w-5xl mx-auto px-4">
                        {/* Center Line (Desktop) */}
                        <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 via-blue-400 to-blue-200 rounded-full"></div>

                        <div className="space-y-12 md:space-y-16">
                            {/* 2024 - Idea */}
                            <div className="relative flex flex-col md:flex-row items-center justify-between group">
                                <div className="hidden md:block w-5/12 text-right pr-8">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">G'oya va Tahlil</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Surxondaryo bozorini o'rganish va aholining onlayn savdoga bo'lgan ehtiyojini aniqlash.
                                        Loyiha konsepsiyasi ishlab chiqildi.
                                    </p>
                                </div>

                                <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-10 h-10 rounded-full bg-white border-4 border-blue-500 shadow-xl flex items-center justify-center z-20 group-hover:scale-125 transition-transform duration-300">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                </div>

                                <div className="w-full md:w-5/12 pl-12 md:pl-8">
                                    <div className="flex items-center gap-3 mb-2 md:hidden">
                                        <span className="text-2xl font-bold text-blue-600">2024</span>
                                        <h3 className="text-lg font-bold text-gray-900">G'oya va Tahlil</h3>
                                    </div>
                                    <span className="hidden md:block text-5xl font-black text-slate-200 mb-2 group-hover:text-blue-100 transition-colors">2024</span>
                                    <p className="md:hidden text-gray-600 mb-4 text-sm">Loyiha konsepsiyasi ishlab chiqildi va bozor o'rganildi.</p>

                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                                        <Target size={14} /> Boshlanish
                                    </div>
                                </div>
                            </div>

                            {/* 2025 - Creation */}
                            <div className="relative flex flex-col md:flex-row-reverse items-center justify-between group">
                                <div className="hidden md:block w-5/12 text-left pl-8">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Platforma Yaratildi</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Dasturchilar va dizaynerlar jamoasi tomonidan HADAF platformasi (Veb-sayt va Mobil ilova)
                                        to'liq ishlab chiqildi va test rejimida ishga tushirildi.
                                    </p>
                                </div>

                                <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-10 h-10 rounded-full bg-blue-600 border-4 border-white shadow-xl flex items-center justify-center z-20 group-hover:scale-125 transition-transform duration-300">
                                    <CheckCircle size={20} className="text-white" />
                                </div>

                                <div className="w-full md:w-5/12 pl-12 md:pr-8 md:pl-0 md:text-right">
                                    <div className="flex items-center gap-3 mb-2 md:hidden">
                                        <span className="text-2xl font-bold text-blue-600">2025</span>
                                        <h3 className="text-lg font-bold text-gray-900">Platforma Yaratildi</h3>
                                    </div>
                                    <span className="hidden md:block text-5xl font-black text-blue-600 mb-2 transform md:translate-x-2">2025</span>
                                    <p className="md:hidden text-gray-600 mb-4 text-sm">Platforma to'liq ishlab chiqildi va test qilindi.</p>

                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-100">
                                        <Zap size={14} /> Active Development
                                    </div>
                                </div>
                            </div>

                            {/* 2026 - Launch */}
                            <div className="relative flex flex-col md:flex-row items-center justify-between group">
                                <div className="hidden md:block w-5/12 text-right pr-8">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Rasmiy Ishga Tushish</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Keng ko'lamli marketing kampaniyasi va Surxondaryoning barcha tumanlarida faoliyatni boshlash.
                                        100 000+ foydalanuvchiga xizmat ko'rsatish.
                                    </p>
                                </div>

                                <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 border-4 border-white shadow-xl flex items-center justify-center z-20 group-hover:scale-125 transition-transform duration-300">
                                    <TrendingUp size={20} className="text-white" />
                                </div>

                                <div className="w-full md:w-5/12 pl-12 md:pl-8">
                                    <div className="flex items-center gap-3 mb-2 md:hidden">
                                        <span className="text-2xl font-bold text-purple-600">2026</span>
                                        <h3 className="text-lg font-bold text-gray-900">Katta Ochilish</h3>
                                    </div>
                                    <span className="hidden md:block text-5xl font-black text-slate-200 mb-2 group-hover:text-purple-100 transition-colors">2026</span>
                                    <p className="md:hidden text-gray-600 mb-4 text-sm">Rasmiy ishga tushish va viloyat bo'ylab kengayish.</p>

                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100">
                                        <ArrowRight size={14} /> Kelajak
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 7. Call to Action */}
            <div className="container pb-16 md:pb-20">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6">Biz bilan hamkorlik qilishga tayyormisiz?</h2>
                        <p className="text-gray-400 mb-6 md:mb-8 max-w-2xl mx-auto text-sm md:text-base">
                            Tadbirkormisiz? O'z mahsulotlaringizni HADAF platformasida soting va biznesingizni yangi bosqichga olib chiqing.
                        </p>
                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold shadow-lg shadow-blue-600/50 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto text-sm md:text-base">
                            Hamkorlikni Boshlash <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
