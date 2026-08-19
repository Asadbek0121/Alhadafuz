/**
 * Adds the per-page SEO titles/descriptions to the `Meta` namespace of every
 * locale file, in one pass, so the three files cannot drift apart.
 *
 * Run with: node scripts/seed-seo-messages.mjs
 *
 * Idempotent — re-running overwrites the Meta page entries with the values
 * below and leaves every other namespace untouched. Existing `Meta.title` and
 * `Meta.description` (the site-wide defaults) are preserved.
 */
import { readFile, writeFile } from 'node:fs/promises';

/**
 * key -> { uz, ru, en } -> [title, description]
 *
 * Titles are what shows in the browser tab, so they are short and lead with the
 * distinguishing word. The `%s | Hadaf Market` suffix is added by the metadata
 * template, except where the page opts out of it (home).
 */
const PAGES = {
    home: {
        uz: [
            "Hadaf Market — Onlayn savdo va tezkor yetkazib berish",
            "HADAF Marketpleys: minglab mahsulot bir joyda. Termiz va Surxondaryo bo'ylab tezkor yetkazib berish, respublika bo'ylab pochta, xavfsiz to'lov va muddatli to'lov imkoniyati.",
        ],
        ru: [
            "Hadaf Market — онлайн-покупки с быстрой доставкой",
            "Маркетплейс HADAF: тысячи товаров в одном месте. Быстрая доставка по Термезу и Сурхандарье, почта по всей республике, безопасная оплата и рассрочка.",
        ],
        en: [
            "Hadaf Market — Online shopping with fast delivery",
            "HADAF marketplace: thousands of products in one place. Fast delivery across Termez and Surkhandarya, nationwide post, secure payment and instalments.",
        ],
    },
    about: {
        uz: [
            "Biz haqimizda",
            "HADAF Marketpleys tarixi, jamoasi va qadriyatlari. Surxondaryo va butun O'zbekiston aholisi uchun qulaylik, tezkorlik va halollik standartlarini belgilovchi platforma.",
        ],
        ru: [
            "О нас",
            "История, команда и ценности маркетплейса HADAF — платформы, которая задаёт стандарты удобства, скорости и честности для Сурхандарьи и всего Узбекистана.",
        ],
        en: [
            "About us",
            "The story, team and values behind HADAF marketplace — a platform setting the standard for convenience, speed and fairness in Surkhandarya and across Uzbekistan.",
        ],
    },
    delivery: {
        uz: [
            "Yetkazib berish",
            "Termiz shahri ichida tezkor yetkazib berish, Surxondaryo tumanlariga kuryerlik xizmati va respublika bo'ylab pochta orqali jo'natish. Muddatlar va narxlar.",
        ],
        ru: [
            "Доставка",
            "Быстрая доставка в Термезе, курьерская служба по районам Сурхандарьи и отправка почтой по всей республике. Сроки и стоимость.",
        ],
        en: [
            "Delivery",
            "Fast delivery within Termez, courier service across Surkhandarya districts and nationwide shipping by post. Timeframes and pricing.",
        ],
    },
    faq: {
        uz: [
            "Ko'p beriladigan savollar",
            "Buyurtma berish, to'lov, yetkazib berish va mahsulotni qaytarish bo'yicha eng ko'p so'raladigan savollarga javoblar.",
        ],
        ru: [
            "Часто задаваемые вопросы",
            "Ответы на частые вопросы о заказе, оплате, доставке и возврате товара.",
        ],
        en: [
            "Frequently asked questions",
            "Answers to the most common questions about ordering, payment, delivery and returns.",
        ],
    },
    returns: {
        uz: [
            "Qaytarish va almashtirish",
            "Mahsulotni qaytarish va almashtirish tartibi: muddatlar, shartlar va pul mablag'ini qaytarish jarayoni.",
        ],
        ru: [
            "Возврат и обмен",
            "Порядок возврата и обмена товара: сроки, условия и процесс возврата денежных средств.",
        ],
        en: [
            "Returns and exchanges",
            "How to return or exchange a product: deadlines, conditions and the refund process.",
        ],
    },
    stores: {
        uz: [
            "Do'konlarimiz",
            "HADAF do'konlari manzillari, ish vaqti va telefon raqamlari. Sizga eng yaqin filialni xaritada toping.",
        ],
        ru: [
            "Наши магазины",
            "Адреса магазинов HADAF, часы работы и телефоны. Найдите ближайший филиал на карте.",
        ],
        en: [
            "Our stores",
            "HADAF store addresses, opening hours and phone numbers. Find your nearest branch on the map.",
        ],
    },
    support: {
        uz: [
            "Yordam markazi",
            "HADAF qo'llab-quvvatlash xizmati bilan telefon, Telegram yoki email orqali bog'laning. Onlayn chat ham mavjud.",
        ],
        ru: [
            "Центр поддержки",
            "Свяжитесь со службой поддержки HADAF по телефону, в Telegram или по email. Также доступен онлайн-чат.",
        ],
        en: [
            "Help centre",
            "Reach HADAF support by phone, Telegram or email. Live chat is available too.",
        ],
    },
    privacy: {
        uz: [
            "Maxfiylik siyosati",
            "Shaxsiy ma'lumotlaringizni qanday yig'amiz, saqlaymiz, ishlatamiz va himoya qilamiz — to'liq bayonot.",
        ],
        ru: [
            "Политика конфиденциальности",
            "Как мы собираем, храним, используем и защищаем ваши персональные данные — полное изложение.",
        ],
        en: [
            "Privacy policy",
            "How we collect, store, use and protect your personal data — the full statement.",
        ],
    },
    terms: {
        uz: [
            "Ommaviy oferta",
            "HADAF Marketpleysidan foydalanish shartlari, tomonlarning huquq va majburiyatlari, tranzaksiyalarni tartibga soluvchi huquqiy hujjat.",
        ],
        ru: [
            "Публичная оферта",
            "Условия использования маркетплейса HADAF, права и обязанности сторон, правовой документ, регулирующий все транзакции.",
        ],
        en: [
            "Public offer",
            "Terms of use for the HADAF marketplace, the rights and obligations of each party, and the legal document governing all transactions.",
        ],
    },

    // Session-bound pages. These carry noindex, so the description is only ever
    // read by a human looking at the markup — kept short on purpose.
    cart: {
        uz: ["Savatcha", "Savatchangizdagi mahsulotlar va buyurtma summasi."],
        ru: ["Корзина", "Товары в вашей корзине и сумма заказа."],
        en: ["Cart", "The products in your cart and your order total."],
    },
    checkout: {
        uz: ["Buyurtmani rasmiylashtirish", "Yetkazib berish manzili va to'lov usulini tanlash."],
        ru: ["Оформление заказа", "Выбор адреса доставки и способа оплаты."],
        en: ["Checkout", "Choose your delivery address and payment method."],
    },
    favorites: {
        uz: ["Sevimlilar", "Siz saqlab qo'ygan mahsulotlar."],
        ru: ["Избранное", "Товары, которые вы сохранили."],
        en: ["Favourites", "The products you have saved."],
    },
    orderSuccess: {
        uz: ["Buyurtma qabul qilindi", "Buyurtmangiz qabul qilindi va qayta ishlanmoqda."],
        ru: ["Заказ принят", "Ваш заказ принят и обрабатывается."],
        en: ["Order received", "Your order has been received and is being processed."],
    },
    track: {
        uz: ["Buyurtmani kuzatish", "Buyurtmangiz qayerda — real vaqtda holatini kuzatib boring."],
        ru: ["Отслеживание заказа", "Где ваш заказ — следите за статусом в реальном времени."],
        en: ["Track order", "Where your order is — follow its status in real time."],
    },
    auth: {
        uz: ["Kirish", "Hisobingizga kiring yoki yangi hisob yarating."],
        ru: ["Вход", "Войдите в свой аккаунт или создайте новый."],
        en: ["Sign in", "Sign in to your account or create a new one."],
    },
    authLogin: {
        uz: ["Kirish", "Telefon raqamingiz orqali HADAF hisobingizga kiring."],
        ru: ["Вход", "Войдите в аккаунт HADAF по номеру телефона."],
        en: ["Sign in", "Sign in to your HADAF account with your phone number."],
    },
    authRegister: {
        uz: ["Ro'yxatdan o'tish", "Yangi HADAF hisobini yaratib, buyurtmalarni kuzatib boring."],
        ru: ["Регистрация", "Создайте аккаунт HADAF и отслеживайте свои заказы."],
        en: ["Sign up", "Create a HADAF account and keep track of your orders."],
    },
    authForgotPassword: {
        uz: ["Parolni tiklash", "Parolni tiklash uchun telefon raqamingizni kiriting."],
        ru: ["Восстановление пароля", "Введите номер телефона для восстановления пароля."],
        en: ["Reset password", "Enter your phone number to reset your password."],
    },
    authResetPassword: {
        uz: ["Yangi parol", "Hisobingiz uchun yangi parol o'rnating."],
        ru: ["Новый пароль", "Установите новый пароль для аккаунта."],
        en: ["New password", "Set a new password for your account."],
    },

    profile: {
        uz: ["Shaxsiy kabinet", "Buyurtmalar, manzillar, bonuslar va hisob sozlamalari."],
        ru: ["Личный кабинет", "Заказы, адреса, бонусы и настройки аккаунта."],
        en: ["My account", "Orders, addresses, bonuses and account settings."],
    },
    profileInfo: {
        uz: ["Shaxsiy ma'lumotlar", "Ism, telefon raqami va boshqa hisob ma'lumotlarini tahrirlash."],
        ru: ["Личные данные", "Изменение имени, номера телефона и других данных аккаунта."],
        en: ["Personal details", "Edit your name, phone number and other account details."],
    },
    profileOrders: {
        uz: ["Mening buyurtmalarim", "Barcha buyurtmalaringiz tarixi va holati."],
        ru: ["Мои заказы", "История и статус всех ваших заказов."],
        en: ["My orders", "The history and status of all your orders."],
    },
    profileInvoice: {
        uz: ["Hisob-faktura", "Buyurtma uchun hisob-faktura."],
        ru: ["Счёт-фактура", "Счёт-фактура по заказу."],
        en: ["Invoice", "The invoice for your order."],
    },
    profileAddresses: {
        uz: ["Mening manzillarim", "Yetkazib berish manzillarini qo'shish va tahrirlash."],
        ru: ["Мои адреса", "Добавление и изменение адресов доставки."],
        en: ["My addresses", "Add and edit your delivery addresses."],
    },
    profileNotifications: {
        uz: ["Bildirishnomalar", "Buyurtma va aksiyalar haqidagi xabarlar."],
        ru: ["Уведомления", "Сообщения о заказах и акциях."],
        en: ["Notifications", "Messages about your orders and promotions."],
    },
    profileSecurity: {
        uz: ["Xavfsizlik", "PIN kod, parol va hisobga kirish xavfsizligi sozlamalari."],
        ru: ["Безопасность", "Настройки PIN-кода, пароля и безопасности входа."],
        en: ["Security", "PIN code, password and sign-in security settings."],
    },
    profileSettings: {
        uz: ["Sozlamalar", "Til, bildirishnoma va ilova sozlamalari."],
        ru: ["Настройки", "Язык, уведомления и настройки приложения."],
        en: ["Settings", "Language, notification and app settings."],
    },

    courier: {
        uz: ["Kuryer paneli", "Kuryerlar uchun ish paneli."],
        ru: ["Панель курьера", "Рабочая панель для курьеров."],
        en: ["Courier panel", "The working panel for couriers."],
    },
    courierReport: {
        uz: ["Kuryer hisoboti", "Yetkazilgan buyurtmalar va inkassa hisoboti."],
        ru: ["Отчёт курьера", "Отчёт по доставленным заказам и инкассации."],
        en: ["Courier report", "Report on delivered orders and cash collection."],
    },
    courierScan: {
        uz: ["QR kodni skanerlash", "Buyurtma QR kodini skanerlab holatini yangilash."],
        ru: ["Сканирование QR-кода", "Отсканируйте QR-код заказа, чтобы обновить статус."],
        en: ["Scan QR code", "Scan an order QR code to update its status."],
    },

    // Dynamic pages: used when the record cannot be loaded, and as the
    // `%s`-free wrapper for the ones that can.
    product: {
        uz: ["Mahsulot", "HADAF Marketpleysdagi mahsulot: narx, tavsif, xususiyatlar va sharhlar."],
        ru: ["Товар", "Товар на маркетплейсе HADAF: цена, описание, характеристики и отзывы."],
        en: ["Product", "A product on the HADAF marketplace: price, description, specs and reviews."],
    },
    category: {
        uz: ["Katalog", "HADAF Marketpleys katalogi — kategoriya bo'yicha mahsulotlar."],
        ru: ["Каталог", "Каталог маркетплейса HADAF — товары по категориям."],
        en: ["Catalogue", "The HADAF marketplace catalogue — products by category."],
    },

    // `{name}` / `{title}` are ICU placeholders filled in by the page.
    categoryPage: {
        uz: [
            "{name} — narxlari va katalogi",
            "{name} toifasidagi mahsulotlar HADAF Marketpleysda: narxlar, tavsiflar va tezkor yetkazib berish.",
        ],
        ru: [
            "{name} — цены и каталог",
            "Товары категории «{name}» на маркетплейсе HADAF: цены, описания и быстрая доставка.",
        ],
        en: [
            "{name} — prices and catalogue",
            "Products in the {name} category on the HADAF marketplace: prices, descriptions and fast delivery.",
        ],
    },
    productPage: {
        uz: [
            "{title}",
            "{title} — HADAF Marketpleysda arzon narxda. Tezkor yetkazib berish, xavfsiz to'lov va muddatli to'lov imkoniyati.",
        ],
        ru: [
            "{title}",
            "{title} — по выгодной цене на маркетплейсе HADAF. Быстрая доставка, безопасная оплата и рассрочка.",
        ],
        en: [
            "{title}",
            "{title} — at a great price on the HADAF marketplace. Fast delivery, secure payment and instalments.",
        ],
    },
};

const LOCALES = ['uz', 'ru', 'en'];

for (const locale of LOCALES) {
    const path = `messages/${locale}.json`;
    const messages = JSON.parse(await readFile(path, 'utf8'));

    const meta = messages.Meta ?? {};
    for (const [key, byLocale] of Object.entries(PAGES)) {
        const [title, description] = byLocale[locale];
        meta[key] = { title, description };
    }
    messages.Meta = meta;

    // Two-space indent and no trailing newline, byte-for-byte matching the
    // existing files so the diff shows only the Meta block.
    await writeFile(path, JSON.stringify(messages, null, 2));
    console.log(`${path} — ${Object.keys(PAGES).length} page entries`);
}
