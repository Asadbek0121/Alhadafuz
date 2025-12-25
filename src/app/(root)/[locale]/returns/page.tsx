export default function ReturnsPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-6">Qaytarish Siyosati</h1>

            <div className="prose max-w-none text-gray-700 space-y-4">
                <p>
                    <strong>HADAF</strong> da xarid qilingan mahsulotlarni O'zbekiston Respublikasi "Iste'molchilar huquqlarini himoya qilish to'g'risida"gi qonuniga muvofiq qaytarishingiz yoki almashtirishingiz mumkin.
                </p>

                <h3 className="font-bold text-lg">Mahsulotni qaytarish shartlari:</h3>
                <ul className="list-disc pl-5">
                    <li>Mahsulot xarid qilinganidan so'ng <strong>10 kun</strong> ichida qaytarilishi mumkin.</li>
                    <li>Mahsulot foydalanilmagan, asl qadoqlanishi buzilmagan va tovar ko'rinishi saqlangan bo'lishi shart.</li>
                    <li>Xarid cheki yoki to'lovni tasdiqlovchi hujjat mavjud bo'lishi kerak.</li>
                </ul>

                <h3 className="font-bold text-lg mt-4">Nuqsonli (brak) mahsulotlar:</h3>
                <p>
                    Agar mahsulotda ishlab chiqarish nuqsoni aniqlansa, u kafolat muddati davomida bepul ta'mirlanadi yoki yangisiga almashtirib beriladi.
                    Buning uchun servis markazi xulosasi talab qilinishi mumkin.
                </p>

                <div className="bg-blue-50 p-4 rounded-lg mt-6 border border-blue-100">
                    <p className="text-sm text-blue-800">
                        <strong>Eslatma:</strong> Gigiena vositalari, parfyumeriya va ayrim turdagi maishiy butlovchi qismlar qaytarib olinmaydi (agar nuqsoni bo'lmasa).
                    </p>
                </div>
            </div>
        </div>
    );
}
