import { useTranslations } from 'next-intl';

export default function AboutPage() {
    const t = useTranslations('Footer');

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-6">Biz haqimizda - HADAF</h1>

            <div className="prose max-w-none text-gray-700 space-y-4">
                <p>
                    <strong>HADAF</strong> — bu O'zbekistondagi zamonaviy va ishonchli maishiy texnika hamda elektronika internet do'koni.
                    Bizning maqsadimiz — xaridorlarga yuqori sifatli mahsulotlarni hamyonbop narxlarda va qulay xizmat ko'rsatish orqali yetkazib berishdir.
                </p>

                <h2 className="text-xl font-semibold mt-4">Bizning qadriyatlarimiz</h2>
                <ul className="list-disc pl-5">
                    <li><strong>Sifat va Kafolat:</strong> Biz faqat rasmiy kafolatga ega bo'lgan original mahsulotlarni sotamiz.</li>
                    <li><strong>Mijozlarga g'amxo'rlik:</strong> Har bir mijoz biz uchun qadrli. Bizning qo'llab-quvvatlash xizmatimiz doimo yordamga tayyor.</li>
                    <li><strong>Tezkorlik:</strong> Buyurtmalarni Toshkent shahri bo'ylab va viloyatlarga tezkor yetkazib berishni ta'minlaymiz.</li>
                    <li><strong>Innovatsiya:</strong> Eng so'nggi texnologiya yangiliklarini birinchilardan bo'lib taqdim etishga intilamiz.</li>
                </ul>

                <h2 className="text-xl font-semibold mt-4">Nega aynan HADAF?</h2>
                <p>
                    Bizning nomimiz "HADAF" arab tilidan tarjima qilinganda "Maqsad" yoki "Nishon" ma'nosini anglatadi.
                    Bizning asosiy nishonimiz — xalqimizning ishonchini oqlash va har bir xonadonga qulaylik olib kirishdir.
                    Biz bilan hamkorlik — bu ishonch, sifat va tejamkorlik demakdir.
                </p>

                <p className="mt-6 italic">
                    Bizni tanlaganingiz uchun rahmat! <br />
                    Hurmat bilan, <strong>HADAF jamoasi.</strong>
                </p>
            </div>
        </div>
    );
}
