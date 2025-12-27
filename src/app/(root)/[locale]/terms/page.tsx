"use client";

export default function TermsPage() {
    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16 text-center text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-3xl md:text-5xl font-bold relative z-10">Ommaviy oferta</h1>
                <p className="text-blue-100 mt-3 text-lg font-light relative z-10">Foydalanish shartlari va qoidalari</p>
            </div>

            <div className="container max-w-4xl -mt-10 relative z-10 px-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-blue-50">
                    <div className="prose prose-lg text-gray-700 max-w-none prose-headings:text-slate-900 prose-a:text-blue-600">
                        <section className="mb-8">
                            <h3>1. Umumiy qoidalar</h3>
                            <p>
                                Ushbu Ommaviy oferta (keyingi o'rinlarda "Oferta") <strong>HADAF</strong> internet do'koni va xaridor o'rtasidagi munosabatlarni tartibga soladi.
                                Saytdan foydalanish va buyurtma berish ushbu shartlarga rozilik bildirishni anglatadi.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h3>2. Shartnoma predmeti</h3>
                            <p>
                                Sotuvchi Mahsulotni Xaridorga mulk huquqi asosida o'tkazish, Xaridor esa Mahsulotni qabul qilish va uning uchun belgilangan narxni to'lash majburiyatini oladi.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h3>3. Narxlar va To'lov tartibi</h3>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Saytdagi mahsulot narxlari O'zbekiston so'mida ko'rsatilgan.</li>
                                <li>To'lov quyidagi usullarda amalga oshirilishi mumkin:
                                    <strong> Naqd pul</strong>, <strong> Payme</strong>, <strong> Click</strong>, <strong> Uzcard/Humo</strong>.
                                </li>
                                <li>Sotuvchi narxlarni ogohlantirmasdan o'zgartirish huquqiga ega (buyurtma tasdiqlangandan so'ng narx o'zgarmaydi).</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h3>4. Yetkazib berish</h3>
                            <p>
                                Yetkazib berish xizmati <strong>Termiz shahri va Surxondaryo viloyati</strong> bo'ylab amalga oshiriladi.
                                Yetkazib berish narxi va muddati buyurtma rasmiylashtirish vaqtida hisoblanadi.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h3>5. Kafolat va Qaytarish</h3>
                            <p>
                                Xaridor 10 kun ichida sifatli mahsulotni qaytarish huquqiga ega (agar tovar ko'rinishi saqlangan bo'lsa).
                                Kafolat muddatidagi nosozliklar servis markazi xulosasi asosida tuzatiladi yoki almashtiriladi.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h3>6. Nizolarni hal qilish</h3>
                            <p>
                                Tomonlar o'rtasidagi kelishmovchiliklar muzokaralar yo'li bilan hal qilinadi. Kelishuvga erishilmaganda, nizo O'zbekiston Respublikasi qonunchiligiga muvofiq sudda ko'rib chiqiladi.
                            </p>
                        </section>
                    </div>

                    <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Oxirgi yangilanish</p>
                            <p className="text-slate-900 font-bold">25 Dekabr, 2025</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 font-medium bg-slate-200 px-3 py-1 rounded-full">v2.1</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
