import { Plus } from 'lucide-react';

export default function FAQPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-6">Savol-Javoblar (FAQ)</h1>

            <div className="space-y-4">
                <details className="group border rounded-lg p-4 bg-white cursor-pointer">
                    <summary className="font-medium flex justify-between items-center list-none">
                        <span>Qanday qilib buyurtma berishim mumkin?</span>
                        <Plus className="group-open:rotate-45 transition-transform" />
                    </summary>
                    <p className="mt-4 text-gray-600 text-sm">
                        Saytimizdan kerakli mahsulotni tanlang, "Savatga qo'shish" tugmasini bosing va o'z ma'lumotlaringizni kiritib, buyurtmani tasdiqlang. Shuningdek, telefon raqamimiz orqali ham buyurtma berishingiz mumkin.
                    </p>
                </details>

                <details className="group border rounded-lg p-4 bg-white cursor-pointer">
                    <summary className="font-medium flex justify-between items-center list-none">
                        <span>To'lovni qanday amalga oshiraman?</span>
                        <Plus className="group-open:rotate-45 transition-transform" />
                    </summary>
                    <p className="mt-4 text-gray-600 text-sm">
                        Siz to'lovni naqd pul, Click, Payme yoki Uzcard/Humo kartalari orqali amalga oshirishingiz mumkin. Hozirda nasiya savdo (bo'lib to'lash) mavjud emas.
                    </p>
                </details>

                <details className="group border rounded-lg p-4 bg-white cursor-pointer">
                    <summary className="font-medium flex justify-between items-center list-none">
                        <span>Mahsulotga kafolat beriladimi?</span>
                        <Plus className="group-open:rotate-45 transition-transform" />
                    </summary>
                    <p className="mt-4 text-gray-600 text-sm">
                        Ha, albatta. Biz sotadigan barcha maishiy texnika va elektronika mahsulotlariga ishlab chiqaruvchi tomonidan rasmiy kafolat beriladi. Kafolat muddati mahsulot turiga qarab farq qiladi.
                    </p>
                </details>

                <details className="group border rounded-lg p-4 bg-white cursor-pointer">
                    <summary className="font-medium flex justify-between items-center list-none">
                        <span>Buyurtmani bekor qilsam bo'ladimi?</span>
                        <Plus className="group-open:rotate-45 transition-transform" />
                    </summary>
                    <p className="mt-4 text-gray-600 text-sm">
                        Buyurtma hali yo'lga chiqmagan bo'lsa, uni bekor qilishingiz mumkin. Buning uchun Call-markazimizga qo'ng'iroq qilishingiz kerak.
                    </p>
                </details>
            </div>
        </div>
    );
}
