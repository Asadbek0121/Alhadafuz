
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
    {
        name: 'Elektronika va Gadjetlar',
        subs: [
            { name: 'Smartfonlar va Telefonlar', subs: ['iPhone', 'Android', 'Tugmali telefonlar'] },
            { name: 'Kompyuter texnikasi', subs: ['Noutbuklar', 'Monitorlar', 'Tizim bloklari', 'Printerlar'] },
            { name: 'Aksessuarlar', subs: ['Powerbanklar', 'Kabellar', 'Adapterlar', 'G\'iloflar'] },
            { name: 'Foto va Video', subs: ['Kameralar', 'Shtativlar', 'Linzalar'] }
        ]
    },
    {
        name: 'Maishiy Texnika',
        subs: [
            { name: 'Yirik texnika', subs: ['Xolodilniklar', 'Kir yuvish mashinalari', 'Gaz plitalari'] },
            { name: 'Oshxona uchun kichik texnika', subs: ['Mikroto\'lqinli pechlar', 'Mikserlar', 'Multivarkalar', 'Choynaklar'] },
            { name: 'Iqlim nazorati', subs: ['Konditsionerlar', 'Isitgichlar', 'Namlagichlar'] },
            { name: 'Uy tozaligi', subs: ['Changyutgichlar', 'Robot-changyutgichlar', 'Dazmollar'] }
        ]
    },
    {
        name: 'Kiyim, Poyabzal va Aksessuarlar',
        subs: [
            { name: 'Ayollar kiyimi', subs: ['Ko\'ylaklar', 'Kostyumlar', 'Sport kiyimlari', 'Ichki kiyimlar'] },
            { name: 'Erkaklar kiyimi', subs: ['Kostyum-shimlar', 'Futbolkalar', 'Jinsilar', 'Kurtkalar'] },
            { name: 'Bolalar kiyimi', subs: ['Yangi tug\'ilganlar uchun', 'Maktab formasi'] },
            { name: 'Poyabzallar', subs: ['Krossovkalar', 'Tuflilar', 'Etiklar'] },
            { name: 'Sumkalar va Hamyonlar', subs: ['Ryukzaklar', 'Ayollar sumkalari', 'Portfellar'] }
        ]
    },
    {
        name: 'Go\'zallik va Salomatlik',
        subs: [
            { name: 'Parfumeriya', subs: ['Ayollar va erkaklar atirlari'] },
            { name: 'Dekorativ kosmetika', subs: ['Lab bo\'yoqlari', 'Pudralar', 'Ko\'z uchun bo\'yoqlar'] },
            { name: 'Terini parvarish qilish', subs: ['Kremlar', 'Niqoblar', 'Losonlar'] },
            { name: 'Shaxsiy gigiyena', subs: ['Shampunlar', 'Sovunlar', 'Tish pastalari'] }
        ]
    },
    {
        name: 'Uy-ro\'zg\'or va Interyer',
        subs: [
            { name: 'Oshxona anjomlari', subs: ['Idish-tovoqlar', 'Servizlar', 'Saqlash idishlari'] },
            { name: 'Yotoqxona', subs: ['Matraslar', 'Choyshablar', 'Yostiqlar'] },
            { name: 'Mebellar', subs: ['Stol-stullar', 'Divanlar', 'Shkaflar'] },
            { name: 'Yoritish', subs: ['Lyustralar', 'Stol lampalari', 'Tashqi yoritish'] }
        ]
    },
    {
        name: 'Sport va Dam olish',
        subs: [
            { name: 'Sport anjomlari', subs: ['Gantellar', 'Turniklar', 'To\'plar'] },
            { name: 'Turizm va Kemping', subs: ['Chodirlar', 'Sayohat sumkalari', 'Fonarlar'] },
            { name: 'Velosport', subs: ['Velosipedlar', 'Dubulg\'alar', 'Aksessuarlar'] }
        ]
    },
    {
        name: 'Avtotovarlar',
        subs: [
            { name: 'Ehtiyot qismlar', subs: ['Filtrlar', 'Shamchalar', 'Tormoz tizimi'] },
            { name: 'Avto-elektronika', subs: ['Magnitolalar', 'Registratorlar', 'Navigatorlar'] },
            { name: 'Avto-kosmetika', subs: ['Moylar', 'Antifrizlar', 'Polirovkalar'] }
        ]
    },
    {
        name: 'Bolalar dunyosi',
        subs: [
            { name: 'O\'yinchoqlar', subs: ['Lego', 'Qo\'g\'irchoqlar', 'Radioboshqariladigan mashinalar'] },
            { name: 'Bolalar uchun oziq-ovqat', subs: ['Smeslar', 'Bo\'tqalar'] },
            { name: 'Gigiyena', subs: ['Pamperslar', 'Nam salfetkalar'] }
        ]
    },
    {
        name: 'Kitoblar va Kanselyariya',
        subs: [
            { name: 'Badiiy adabiyot', subs: ['Jahon adabiyoti', 'O\'zbek adabiyoti', 'Detektivlar'] },
            { name: 'Biznes va psixologiya', subs: [] },
            { name: 'Maktab va ofis anjomlari', subs: [] }
        ]
    },
    {
        name: 'Qurilish va Ta\'mirlash',
        subs: [
            { name: 'Elektr asboblari', subs: ['Drellar', 'Perforatorlar', 'Bolgarkalar'] },
            { name: 'Santexnika', subs: ['Smesitellar', 'Rakvinalar'] },
            { name: 'Qurilish materiallari', subs: [] }
        ]
    },
    {
        name: 'Oziq-ovqat va Ichimliklar',
        subs: [
            { name: 'Choy va Kofe', subs: ['Donli kofe', 'ko\'k choy', 'sovg\'abop to\'plamlar'] },
            { name: 'Shirinliklar', subs: ['Shokoladlar', 'milliy shirinliklar', 'pishiriqlar'] },
            { name: 'Sog\'lom oziq-ovqat', subs: ['Superfoodlar', 'parhez mahsulotlari', 'yong\'oqlar'] },
            { name: 'Ichimliklar', subs: ['Sharbatlar', 'gazlangan suvlar', 'energetiklar'] }
        ]
    },
    {
        name: 'Konselyariya va Ofis jihozlari',
        subs: [
            { name: 'Yozuv qurollari', subs: ['Ruchkalar', 'qalamlar', 'markerlar'] },
            { name: 'Qog\'oz mahsulotlari', subs: ['Daftarlar', 'kundaliklar', 'A4 qog\'ozlari'] },
            { name: 'Ofis texnikasi', subs: ['Shtrederlar', 'laminatorlar', 'hisoblagichlar'] }
        ]
    },
    {
        name: 'Hobbi va Ijodkorlik',
        subs: [
            { name: 'Rasm chizish', subs: ['Mo\'yqalamlar', 'akril bo\'yoqlar', 'molbertlar'] },
            { name: 'Qo\'lda yasash (DIY)', subs: ['To\'qish anjomlari', 'biserlar', 'tikuv mashinalari'] },
            { name: 'Musiqa asboblari', subs: ['Gitaralar', 'sintezatorlar', 'aksessuarlar'] }
        ]
    },
    {
        name: 'Uy hayvonlari uchun',
        subs: [
            { name: 'Itlar va mushuklar uchun', subs: ['Ozuqalar', 'o\'yinchoqlar', 'uyachalar'] },
            { name: 'Akvariumlar', subs: ['Baliqlar uchun ozuqa', 'filtrlar', 'dekorlar'] }
        ]
    },
    {
        name: 'Salomatlik',
        subs: [
            { name: 'Vitaminlar va BFQlar', subs: ['Omega-3', 'Multivitaminlar'] },
            { name: 'Tibbiy buyumlar', subs: ['Tonometrlar', 'termometrlar', 'niqoblar'] },
            { name: 'Gigiyena vositalari', subs: ['Antiseptiklar', 'bog\'lov materiallari'] }
        ]
    },
    {
        name: 'Sovg\'alar va Bayramlar',
        subs: [
            { name: 'Sovg\'abop to\'plamlar', subs: ['Erkaklar va ayollar uchun to\'plamlar'] },
            { name: 'Bayram atributlari', subs: ['Sharlar', 'bezaklar', 'tabriknomalar'] }
        ]
    }
];

// Helper to sanitize slug
const createSlug = (str: string) => {
    return str
        .toLowerCase()
        .replace(/['\'""]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, ''); // Simple ASCII slug, might need better transliteration for Uzbek
};

// Simple transliteration for slugs to support Uzbek better
const transliterate = (text: string) => {
    const map: any = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i',
        'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
        'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '',
        'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': 'o', 'қ': 'q', 'ғ': 'g', 'ҳ': 'h',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'J', 'З': 'Z', 'И': 'I',
        'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
        'У': 'U', 'Ф': 'F', 'Х': 'X', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
        'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya', 'Ў': 'O', 'Қ': 'Q', 'Ғ': 'G', 'Ҳ': 'H'
    };
    return text.split('').map((char) => map[char] || char).join('');
};

const createSlugBetter = (name: string) => {
    const latin = transliterate(name);
    return latin.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

async function main() {
    console.log('Seeding categories...');

    // Clean existing categories to prevent duplicates
    console.log('Cleaning old categories...');
    await prisma.category.deleteMany({});

    for (const cat of categories) {
        const slug = createSlugBetter(cat.name) + '-' + Date.now().toString().slice(-4);

        // Create Parent
        const parent = await prisma.category.create({
            data: {
                name: cat.name,
                slug: slug,
                // No image for now, user can add later
            }
        });
        console.log(`Created Parent: ${cat.name}`);

        for (const sub of cat.subs) {
            const subSlug = createSlugBetter(sub.name) + '-' + Date.now().toString().slice(-4);

            // Create Sub (2nd level)
            const subCat = await prisma.category.create({
                data: {
                    name: sub.name,
                    slug: subSlug,
                    parentId: parent.id
                }
            });
            console.log(`  Created Sub: ${sub.name}`);

            if (sub.subs && sub.subs.length > 0) {
                for (const micro of sub.subs) {
                    const microSlug = createSlugBetter(micro) + '-' + Date.now().toString().slice(-4);

                    // Create Micro (3rd level)
                    // Wait, your logic in 'MegaMenu' only supports 2 levels effectively (Parent -> Child). 
                    // The prompt says "3-daraja: Pastki (Micro) Kategoriyalar (Filterlar uchun)".
                    // I will create them as children of children.
                    await prisma.category.create({
                        data: {
                            name: micro,
                            slug: microSlug,
                            parentId: subCat.id
                        }
                    });
                    console.log(`    Created Micro: ${micro}`);
                }
            }
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
