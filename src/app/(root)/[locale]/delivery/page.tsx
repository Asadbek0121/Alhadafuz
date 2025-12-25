export default function DeliveryPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-6">Tezkor Yetkazib Berish</h1>

            <div className="prose max-w-none text-gray-700 space-y-4">
                <p>
                    <strong>HADAF</strong> jamoasi sizning buyurtmangizni imkon qadar tez va xavfsiz yetkazib berishni ta'minlaydi.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="border p-4 rounded-lg bg-gray-50">
                        <h3 className="font-bold text-lg mb-2">Toshkent shahri bo'ylab</h3>
                        <ul className="list-disc pl-5 text-sm">
                            <li>Yetkazib berish vaqti: 24 soat ichida.</li>
                            <li>Narxi: Bepul (ma'lum bir summadan yuqori xaridlar uchun).</li>
                            <li>Kuryer oldindan qo'ng'iroq qiladi.</li>
                        </ul>
                    </div>

                    <div className="border p-4 rounded-lg bg-gray-50">
                        <h3 className="font-bold text-lg mb-2">Viloyatlar bo'ylab</h3>
                        <ul className="list-disc pl-5 text-sm">
                            <li>Yetkazib berish vaqti: 2-3 ish kuni.</li>
                            <li>BTS yoki Fargo pochta xizmatlari orqali.</li>
                            <li>Narxi: Hudud va vaznga qarab hisoblanadi.</li>
                        </ul>
                    </div>
                </div>

                <h3 className="font-bold text-lg mt-6">Qo'shimcha shartlar</h3>
                <p>
                    - Agar mahsulot omborda mavjud bo'lmasa, yetkazib berish muddati uzayishi mumkin (bu haqda menejer ogohlantiradi).<br />
                    - Og'ir maishiy texnika (muzlatgich, kir yuvish mashinasi) yetkazib berish shartlari farq qilishi mumkin.
                </p>
            </div>
        </div>
    );
}
