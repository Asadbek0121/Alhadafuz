export default function PrivacyPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-6">Maxfiylik Siyosati</h1>

            <div className="prose max-w-none text-gray-700 space-y-4">
                <p>
                    <strong>HADAF</strong> (keyingi o'rinlarda "Biz") foydalanuvchilarning shaxsiy ma'lumotlari xavfsizligini ta'minlashga jiddiy e'tibor beradi.
                    Ushbu hujjat biz qanday ma'lumotlarni to'plashimiz va ulardan qanday foydalanishimizni tushuntiradi.
                </p>

                <h3 className="font-bold text-lg">1. Qanday ma'lumotlarni to'playmiz?</h3>
                <ul className="list-disc pl-5">
                    <li>Ism va familiya;</li>
                    <li>Telefon raqami va elektron pochta manzili;</li>
                    <li>Yetkazib berish manzili;</li>
                    <li>Buyurtma tarixi va to'lov ma'lumotlari.</li>
                </ul>

                <h3 className="font-bold text-lg">2. Ma'lumotlardan foydalanish maqsadi</h3>
                <p>
                    Biz to'plagan ma'lumotlar quyidagi maqsadlarda ishlatiladi:
                    <br />- Buyurtmalarni qayta ishlash va yetkazib berish;
                    <br />- Mijoz bilan bog'lanish va xabar berish;
                    <br />- Xizmat sifatini yaxshilash va shaxsiylashtirish.
                </p>

                <h3 className="font-bold text-lg">3. Ma'lumotlar xavfsizligi</h3>
                <p>
                    Biz sizning shaxsiy ma'lumotlaringizni uchinchi shaxslarga bermaymiz (qonunchilikda belgilangan hollar va yetkazib berish xizmatlari bundan mustasno).
                    Ma'lumotlaringizni himoya qilish uchun zamonaviy shifrlash va xavfsizlik choralarini ko'ramiz.
                </p>

                <p className="mt-4 text-sm text-gray-500">
                    Saytimizdan foydalanish orqali siz ushbu Maxfiylik siyosati shartlariga rozilik bildirasiz.
                </p>
            </div>
        </div>
    );
}
