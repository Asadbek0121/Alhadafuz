# PROJECT_STATE.md — Hadaf Market (uzm)

> AI sessiyalari uchun jonli kontekst. Har bir vazifadan keyin AI ushbu faylni yangilaydi. Batafsil tarix uchun `CHANGELOG.md` ga qarang.

## Project Overview

- **Loyiha**: Hadaf Market — O'zbekiston bozori (Surxondaryo, Termiz markazli) uchun onlayn savdo platformasi.
- **Public domen**: `https://www.alhadaf.uz` (eski fallback `uzm.uz` ishlatilmaydi).
- **Stack**: Next.js 16.3.1 (App Router + Turbopack), React 19.2, TypeScript, PostgreSQL (Neon) + Prisma 5.22, NextAuth v5, next-intl (uz/ru/en), Tailwind CSS 4, PWA, Sentry, TanStack Query, zod, recharts.
- **Integratsiya**: Telegram botlar (support/auth + courier), Click payment, Google/Yandex Maps, Cloudinary/Vercel Blob, Resend.
- **Bosh sahifa**: `src/app/(root)/[locale]/page.tsx`; admin: `src/app/(admin)/admin/`.

## Current Stage

- Faol rivojlanish. 229+ commit, ~110 API route fayl, 33 Prisma model.
- UX/UI audit o'tkazildi; **Phase 1-10 yakunlandi** (Critical UX, Homepage, Search & Category, Product page, Cart & Checkout, Mobile UX, Performance, SEO, Accessibility, Polish).

## Current Focus

- **Production readiness**: Phase 11 audit o'tkazildi — BLOCKER/HIGH risklar hal qilinishi kerak (Click env, build script, Upstash, schema commit).
- Banner analitikasi: `BannerEvent` schema'da (uncommitted) — commit kerak.
- Admin panel audit davom etmoqda.

## Production Readiness (Phase 11 audit, 2026-08-20)

**Remediated (2026-08-20):**
- **B2 ✅**: Prisma Postgres baseline migration (`20260820000000_init_postgres`) yaratildi, SQL tekshirildi (variant/idempotencyKey/BannerEvent — barchasi nullable/xavfsiz). SQLite migrationlar olib tashlandi (postgres uchun yaroqsiz edi). `directUrl = env("DIRECT_URL")` qo'shildi (Neon + PgBouncer advisory lock fix). Build script → `prisma migrate deploy && next build`. `migrate status`: "Database schema is up to date".
- **B1 ✅**: `.env.example` ga `CLICK_SERVICE_ID`/`CLICK_SECRET_KEY` placeholder. Haqiqiy credential'lar production env'ga (Vercel) qo'yilishi kerak.
- **H1 ✅**: `auth/[...nextauth]` POST'ga rate limit qo'shildi (brute-force). Upstash env placeholder `.env.example` da. Env yo'q bo'lsa rate limit disabled (production'da Upstash to'ldirish kerak).
- **H3 ✅**: Tracking API courier phone — anonymous uchun maskalangan (`+998...**`), faqat order egasi/ADMIN to'liq ko'radi.
- **H4 ✅**: API error detail exposure tozalandi — stack/details olib tashlandi (generic "Internal server error"). Validation errorlar saqlanadi.
- **P6 ✅**: `.env.example` yangilandi (Click/Upstash/WebAuthn/Telegram/Yandex). Yandex Maps key 7 fayldan `NEXT_PUBLIC_YANDEX_MAPS_KEY` env'ga ko'chirildi (`src/lib/maps.ts`).
- **P7 ✅**: `npm run build` SUCCESS — `prisma migrate deploy` + next build (101/101 static, 176 routes). Upstash env yo'qligi sababli rate-limit disabled warning (kutilgan).
- **P8 ✅**: Security smoke tests PASS — admin API 401, invalid product 404, unauthenticated orders 401, generic errors.
- **P9 ✅**: Production routes ALL 200 (/uz/ru/en, search, category, product, cart, checkout, order-success, track, favorites, robots, sitemap).

**Qolgan (productionga chiqishdan oldin):**
- **BLOCKER**: `CLICK_SERVICE_ID`/`CLICK_SECRET_KEY` production env'ga qo'yish (Click to'lovi ishlashi uchun).
- **HIGH**: `UPSTASH_REDIS_REST_URL`/`TOKEN` production env'ga qo'yish (rate limiting yoqish).
- Schema o'zgarishlari + migration + `.env.example` + `src/lib/maps.ts` COMMIT qilish (hali commit qilinmagan).

## Performance Baseline (2026-08-20, dev server)

| Route | Time | HTML size |
|-------|------|-----------|
| `/uz` | 0.24s | 270KB |
| `/uz/search?q=a` | 0.80s | 141KB |
| `/uz/category/...` | 1.8-3.0s | 211KB |
| `/uz/product/...` | 2.0-3.4s | 161KB |
| `/uz/cart` | 0.75s | 136KB |
| `/uz/checkout` | 0.71s | 108KB |
| `/uz/track/...` | 0.74s | 137KB |

- Homepage: 35 JS chunk (dev), 281 next/image srcset ref, 26 `<img>`, 3 woff2 font (Montserrat 700/900 latin + Inter).
- Kategoriya: DB query ~1.8s (Neon masofaviy) — asosiy bottleneck.

## Completed Recently
- **Vercel build P1002 fix (3)**: `prepare-direct-url.mjs` endi DIRECT_URL ni true direct host'ga normalizatsiya qiladi — nafaqat `pgbouncer=true`, balki hostname'dan `-pooler` ham olib tashlanadi. Neon pooler endpoint'ida stale advisory lock (avvalgi o'chirilmagan `pg_advisory_lock` sessiyalari) `prisma migrate deploy` da P1002 beradi; true direct host (ep-...-neon.tech) pooling'da emas, shuning uchun lock sessiya yopilishi bilan bo'shaydi. Local'da stale lock topilib, `pg_terminate_backend` bilan bo'shatildi. (`scripts/prepare-direct-url.mjs`)
- 🇨🇳 **Xitoydan buyurtma (CHINA_ORDER fulfillment)** — to'liq zanjir implement qilindi: `Product.fulfillmentType` (authoritative, default LOCAL) + `CartItem`/`OrderItem` snapshot + yangi `Cargo` modeli (PENDING/CALCULATED/PAID placeholder). Migration `20260821051422_china_order_fulfillment` qo'llandi. Product card/detail, Cart, Checkout ("Hozir to'lanadi", "Kargo keyin hisoblanadi"), Order, Admin product form (Sotuv turi radio), Admin order detail (China Order + Cargo status card), Profile orders + invoice — barchasi CHINA_ORDER'ni farqlaydi. Yangi `ChinaOrder` i18n namespace (uz/ru/en). Server authoritative price saqlanadi. (schema, `lib/data.ts`, `useCartStore`, cart/orders API, ProductCard, ProductContent, checkout, admin products/orders, profile orders, invoice)
- **Vercel build P1002 fix (2)**: `scripts/prepare-direct-url.mjs` endi DIRECT_URL allaqachon o'rnatilgan bo'lsa ham uni normalizatsiya qiladi. Vercel env'ida DIRECT_URL `pgbouncer=true` bilan qo'lda o'rnatilgan edi — skript `already set` deb o'tkazib yuborgan va `prisma migrate deploy` transaction-mode ulanishda advisory lock ololmay P1002 bergan. Endi `pgbouncer=true` bo'lsa override qilib to'g'ri variantni yozadi. (`scripts/prepare-direct-url.mjs`)
- **MegaMenu child navigation fix**: Desktop childGrid child linklari `window.open(url, '_self')` + `preventDefault` o'rniga native `<a href>` (no preventDefault) + `window.location.assign` bilan almashtirildi. Root kategoriya va mobile drill-down ham `window.location.assign`ga o'tkazildi. Bu Telegram WebView'da `/uz`ga tushib ketish muammosini bartaraf qiladi. (`MegaMenu.tsx`)

**Phase 10 — Final Accessibility & UI Polish (2026-08-20):**
- **`useFocusTrap` hook** (yangi): CartDrawer'ga qo'llandi — `role="dialog"` + `aria-modal` + Tab trap + Escape + focus restore. AuthModal allaqachon to'liq focus trap + Escape + dialog semantics'ga ega edi (tekshirildi, o'zgarish kerak emasdi).
- **Hero carousel a11y**: pause/play tugmasi (`aria-pressed`), `prefers-reduced-motion` → autoplay o'chadi, `role="region"` + `aria-roledescription="carousel"`, dots `aria-current`.
- **Checkout field a11y**: `fieldErrors` state, phone `aria-invalid` + `aria-describedby` + inline `role="alert"` error, district error.
- **Payment icons self-host**: Payme/Uzcard/Humo SVG asaxiy.uz CDN'dan `public/` ga ko'chirildi (0 external CDN reference qoldi).
- **i18n**: CartDrawer empty state, MegaMenu status messages, `Cart.close` — barcha locale'larga.
- **Design tokens**: yangi token qo'shilmadi (keraksiz refactoring yo'q).

**Phase 9 — Accessibility / WCAG (2026-08-20):**
- **ProductCard wishlist**: `<div role="button">` → native `<button type="button">` — keyboard operable (Tab/Enter/Space), `aria-pressed`, dynamic `aria-label` (qo'shish/olib tashlash). (`ProductCard.tsx`)
- **Product gallery lightbox**: Escape yopadi, ochilganda focus close tugmasiga, yopilganda fokus galereyaga qaytadi, `role="dialog"` + `aria-modal` + `aria-label`. (`ProductContent.tsx`)
- **MegaMenu keyboard**: kategoriya itemlari native `<button>`, ArrowDown/ArrowUp kategoriyalar orasida, Escape yopadi, `role="tablist"`/`role="tab"` + `aria-selected`, `onFocus` bilan hover o'rniga. (`MegaMenu.tsx`)
- **Search combobox**: `role="listbox"` + `role="option"` + `aria-selected` + `aria-activedescendant` (keyboard nav'da). (`Header.tsx`)
- **Form errors**: checkout error banner `role="alert"` (Phase 5), mobil CTA `aria-live="polite"` total.
- **Qolgan WCAG**: Carousel autoplay pause, AuthModal/CartDrawer to'liq focus trap, color contrast audit (Phase 10 da davom etadi).

**Phase 8 — SEO & Search Engine Architecture (2026-08-20):**
- **robots.txt**: `src/app/robots.ts` — `/admin`, `/api`, `/auth`, `/profile`, `/checkout`, `/track`, `/search` (har locale bilan) block. Sitemap reference. Google product/category crawl qila oladi.
- **sitemap.xml**: `src/app/sitemap.ts` — `revalidate: 3600`. Homepage (3 locale), category (2), product (6) × 3. DB query. Search/filter URL'lari yo'q.
- **BreadcrumbList JSON-LD**: category (Home → Qalambooks), product (Home → Qalambooks → Product). `breadcrumbJsonLd()` helper. Locale-aware label.
- **Product JSON-LD**: `aggregateRating` — faqat real rating/reviews bo'lsa (fake yo'q).
- **Organization**: fake `sameAs` olib tashlandi (real profillar bo'lmaguncha). WebSite SearchAction qo'shildi.
- **Invoice `uzm.uz`**: `www.alhadaf.uz` ga tuzatildi.
- **Product URL strategy**: audit. Slug field yo'q, 6 product, duplicate title yo'q. `[id]` URL'lar ishlaydi. Slug migration hozircha kerak emas — katalog kichik. Katalog o'sganda: `[slug]` + 301 redirects.

**Phase 7 — Performance (2026-08-20):**
- **Track polling fix (P0)**: `track/[id]` endi DELIVERED/COMPLETED/CANCELLED (terminal) holatga yetganda polling to'xtaydi. Network error'da ham to'xtaydi (infinite retry yo'q — "Qayta urinish" tugmasi orqali). Cleanup `stopPolling()`. (`track/[id]/page.tsx`)
- **Category render (P0)**: bitta DOM tasdiqlandi — `useMediaQuery` (Phase 3) faqat bitta tree render qiladi. Qo'shimcha o'zgarish kerak emasdi.
- **Search duplicate (P1)**: `useCallback` + AbortController — har param o'zgarishida 1 request (tasdiqlangan). Duplicate yo'q.
- **Image optimization (P1)**: cart item image, category banner (desktop+mobile), subcategory image → `next/image` (fill + sizes). ProductCard/Hero/ProductContent allaqachon next/image.
- **Fonts**: Montserrat 700/900 latin (faqat logo) — minimal, branding saqlandi. O'zgartirilmadi.
- **Server/client boundary**: `React.cache()` (Phase 4) saqlanadi. Double-fetch yo'q (tasdiqlangan: 1 API call/product, 1 API call/search).
- **Qolgan bottleneck**: kategoriya DB query ~1.8s (Neon masofaviy latency). `unstable_cache` dynamic key qo'llab-quvvatlamaydi (bu Next.js versiyada) — kross-request category cache murakkab; CDN/edge cache infrastructure masalasi.

**Phase 6 — Mobile UX (2026-08-20):**
- **BottomNav**: product sahifasida endi ko'rsatiladi (avval `return null` edi — navigatsiya bo'shlig'i hal qilindi). Checkout'da yashirin qoladi (o'z sticky CTA'si bor). Safe-area `bottom-[calc(1rem+env(safe-area-inset-bottom))]`. Home active state `/en` ni ham tan oladi. `aria-label`, `aria-current`, `aria-expanded`. (`BottomNav.tsx`)
- **Product sticky CTA**: mobil'da BottomNav ustida joylashadi (`bottom: calc(89px + env(safe-area-inset-bottom))` @<1024px, desktop'da `bottom: 0`). Container padding `180px` mobil'da (kontent yashirinmaydi). (`page.module.css`, `ProductContent.tsx`)
- **LanguageSwitcher**: mobil aylanish (UZ→RU→EN) butunlay olib tashlandi — hamma ekranlarda dropdown. "Tilni tanlang" i18n (`Header.language_switcher`). `aria-haspopup`, `aria-expanded`, `role="menu"/"menuitemradio"`. (`LanguageSwitcher.tsx`)
- **`xs:` breakpoint**: Tailwind v4 `@theme`'ga `--breakpoint-xs: 480px` qo'shildi (Header, MapModal, profile/orders'da ishlatilgan edi, aniqlanmagan edi). (`globals.css`)
- **Safe-area**: `body` padding `calc(70px + env(safe-area-inset-bottom))`. (`globals.css`)
- **Filter drawer** (SearchClient): Escape yopish, `role="dialog"` `aria-modal`, body scroll lock, safe-area bottom padding. (`SearchClient.tsx`)
- **WASM CSP**: `script-src` production'da `'wasm-unsafe-eval'` qo'shildi (dotlottie admin 2FA animatsiyasi). (`next.config.ts`)

**Idempotency (Option A) + Phase 5** (avvalgi sessiya):
- **Variant merge identity**: `cartItemKey(id+variant)` — cart store `addToCart`/`removeFromCart`/`updateQuantity` id+variant bo'yicha. Cart page, CartDrawer, checkout sidebar variant'ni ko'rsatadi va id+variant key ishlatadi.
- **Cart hydration**: cart page'da `isHydrated` guard + professional loading (Loader2). Empty cart faqat hydration tugagach ko'rsatiladi.
- **Cart price**: `oldPrice` cart item'ga qo'shildi; `discount()` computed (real chegirma, `oldPrice > price`). Cart summary'da `-0` discount olib tashlandi (faqat real savings > 0 ko'rsatiladi), delivery `0` o'rniga "narx buyurtma jarayonida hisoblanadi". Hardcoded "Apple" brand olib tashlandi.
- **Delivery fake-FREE fix**: `deliveryAvailable` state (null=district yo'q, true=zone topildi, false=zone yo'q). `false` bo'lsa "Mavjud emas" ko'rsatiladi va submit bloklanadi (`delivery_unavailable` error).
- **Checkout progress stepper**: `CheckoutStepper` — 3 bosqich (Contact/Delivery/Payment) completed/current state'lar bilan.
- **Mobile sticky CTA**: `lg:hidden fixed` bottom bar — jami summa + "To'lovga o'tish" submit, safe-area padding, loading/disabled states, `aria-live` total.
- **Order review**: checkout sidebar'da variant label (JSON parse), quantity, price.
- **Backend security**: order create endi mavjud bo'lmagan/o'chirilgan product'ni rad etadi (client price authoritative emas — serverdan olinadi). Idempotency guard: 30 soniyadagi bir xil total'li oxirgi order qaytariladi (duplicate order oldini olish).
- **Double-submit guard**: `submittingRef` (sync) + `isProcessing` (UI) — ikki marta bosish bloklanadi.
- **Click flow**: Phase 1 fix saqlangan — `clearCart()` faqat order-success'da buyurtma tasdiqlanganda.

**Phase 4 — Product Page (2026-08-20):**
- **Variant architecture (minimal migration)**: `CartItem.variant` va `OrderItem.variant` String? qo'shildi (DB push qilindi). Cart store `variant?: string` + `addToCart` id+variant bo'yicha merge. Checkout payload + Orders API `variant` uzatadi/`OrderItem`'da saqlaydi. ProductContent `selectedOptions` JSON'ini `addToCart`'ga yuboradi.
- **Double-fetch fix**: `fetchProduct` → `React.cache()` — `generateMetadata` va page bitta fetch ishlatadi (tasdiqlangan: 1 API chaqiruv).
- **Gallery**: `next/image` main image (width/height/sizes/priority), thumbnails lazy + keyboard accessible, broken image fallback (placehold.co), mobil swipe.
- **CTA**: `buying` state (buy-now loading), infinite loading yo'q; variant cart'ga o'tadi.
- **Delivery row**: real `freeDelivery` flag yoki "narx buyurtma jarayonida hisoblanadi" (fake FREE yo'q).
- **Product JSON-LD**: name/image/description/sku/brand/offers (price UZS, availability real stock). BreadcrumbList foundation `breadcrumbJsonLd()` (tayyor, qo'llash kutilmoqda).
- **Installment**: `price/12` hardcoded qoldirildi (real installment data yo'q) — faqat `allowInstallment` flag bo'lsa ko'rsatiladi.

**Phase 3 — Search & Category (2026-08-20):**
- **`/api/products` kengaytirildi**: `sort` (price_asc/desc, newest, discount), `minPrice`/`maxPrice`, `category` (slug), `discount`, `page`/`limit` parametrlari bilan. Backward-compatible: `q` yoki pagination paramsiz eski format (array) qaytadi. `q` bilan → `{ products, total, page, limit, totalPages }`.
- **`/search` sahifasi**: URL-based state (`?q=...&sort=...&category=...`). Sort dropdown, filter drawer (kategoriya, narx oralig'i, chegirma), product grid, empty/loading/error states, pagination. Noindex metadata. So'nggi qidiruvlar (localStorage). `SearchClient` komponenti.
- **Header search upgrade**: 300ms debounce, AbortController (race condition fix), keyboard navigation (ArrowUp/Down/Enter), `role="combobox"` a11y, "Barchasini ko'rish" → `/search?q=...`, so'nggi qidiruvlar dropdown'da, error state, `autoComplete="off"`.
- **Kategoriya sahifasi**: URL-based sort (server Prisma + client), product count, `useMediaQuery` hook bilan no-double-DOM (faqat bitta DOM render), o'lik "Barcha bo'limlar" → `search` sahifasiga link, mobil'da empty state. `getCachedRootCategories()` (Phase 2) — reuse.
- **Yangi**: `useMediaQuery` hook, `Search` i18n namespace (24 key, uz/ru/en), `Meta.search` metadata.
- **API backward compat**: `categoryId` (eski direct-FK, related products) va `category` (slug) parametrlari alohida ishlaydi. Hech qanday paramsiz → `getCachedProducts()` (eski cached array).

**Phase 2 — Homepage (2026-08-20):**
- **Kategoriya tezkor-linklari**: `getCachedRootCategories()` — faol ildiz kategoriyalar (real data). Mobil'da horizontal scroll, desktop'da grid. `CategoryCard` komponenti.
- **Flash Deals**: `getCachedFlashDeals(8)` — real chegirmali mahsulotlar (`discount > 0` YOKI `oldPrice > price`, Prisma ustunlararo taqqoslash qo'llab-quvvatlamagani uchun JS'da filter). Countdown qo'shilmadi (real expiry yo'q).
- **"Nega HADAF?" trust section**: `TrustSection` komponenti — 4 real xizmat (tezkor yetkazish, qulay to'lov, kafolat, sifat). Statistika yozilmadi (DB tasdiqlamaydi).
- **New Arrivals bo'limi ataylab qo'shilmadi**: katalogda faqat 6 ta mahsulot, `getCachedHomepageProducts` allaqachon `createdAt` desc — "Popular" bilan bir xil bo'lardi. Katalog o'sganda qo'shiladi.
- **Homepage ierarxiya**: Hero → Kategoriyalar → Chegirmalar → Ommabop (h1) → Nega HADAF → Footer.
- `no-scrollbar` utility globals.css'ga qo'shildi (CategoryContent'da ham ishlatilgan edi, aniqlanmagan edi).
- `Header` namespace'ga `kategoriyalar`, `chegirmalar` i18n keylari qo'shildi (uz/ru/en).
- **H1 bitta saqlanadi** ("Ommabop mahsulotlar"), qolgan section sarlavhalari h2.

**Phase 1 — Critical UX fixes (2026-08-20):**
- **Checkout**: Click to'loviga o'tishdan OLDIN savat clear qilinmas — endi savat `order-success` sahifasida buyurtma tasdiqlangandan keyin tozalanadi.
- **Order-success**: `orderId` bo'lmasa yoki buyurtma topilmasa cheksiz spinner o'rniga empty state + "Bosh sahifa" CTA; order fetch xatosida ham error state.
- **Track page**: network error'da cheksiz spinner o'rniga "Aloqa uzildi" + "Qayta urinish" (retry) + "Bosh sahifaga".
- **Homepage**: `getCachedProducts()` butun katalog o'rniga `getCachedHomepageProducts(24)` — cheklangan mahsulot; "Barchasini ko'rish" tugmasi katalog menyusini ochadi; bo'sh state qo'shildi.
- **SEO foundation**: homepage'da `<h1>`, layout'da `<main>` landmark, JSON-LD (Organization + WebSite), `breadcrumbJsonLd()` helper, canonical/og:url `https://www.alhadaf.uz` ga tuzatildi (avval `uzm.uz` edi).

Avvalgi sessiyalardan:
- `<Script>` telegram-web-app.js client komponentdan tashqariga ko'chirildi (konsol xatosi).
- `BannerEvent` modeli qo'shildi (uncommitted, db push kutilmoqda).
- Admin panel auditi, Telegram xabarlari admin panelda, CLS optimizatsiyasi.

## In Progress

- **`prisma/schema.prisma`** — `BannerEvent` modeli qo'shildi; `npx prisma generate` + migratsiya kerak (uncommitted). Build `prisma migrate deploy` ishlatadi (db push emas).
- **Lint**: `.eslintcache` buzilganda `eslint` osilib qoladi — `rm -f .eslintcache` qilib qayta ishga tushirish yoki `node node_modules/eslint/bin/eslint.js` bilan.

## Next Tasks

- 🇨🇳 **Cargo real hisoblash** (kelajak): Cargo modeli tayyor (PENDING/CALCULATED/PAID) — real kargo calculator, weight/partiya, admin kargo kirituvchi forma, user cargo payment oqimi alohida bosqich. Hozir ataylab placeholder.
- **"🇨🇳 Xitoydan buyurtma" root kategoriya** yaratish (admin panel orqali) va unga CHINA_ORDER mahsulotlarini bog'lash — productlar `fulfillmentType` bilan ajratiladi, kategoriya alohida tushuncha.
- **Production readiness**: Click payment env (`CLICK_SERVICE_ID`, `CLICK_SECRET_KEY`), Upstash rate limit, `.env` cleanup.
- **Product slug migration** (katalog o'sganda): `Product.slug` + `@@unique` + `/product/[slug]` + 301 redirect. Hozircha `[id]` ishlatiladi.
- **BannerEvent** migratsiyasini tugatish (generate + push + admin analitika).
- **Variant cheklov**: `@@unique([cartId, productId])` — variant mahsulotlar DB cart'da bitta qator.
- `Checkout`'da `/api/admin/shipping` GET public endpoint — public shipping endpoint'ga ko'chirish.

## Known Issues

1. **Node 25 + Turbopack hang**: `next dev` "Compiling instrumentation" da osilib qoladi. Yechim: Node 22 LTS (`nvm use 22`), `.next` ni o'chirib qayta ishga tushirish.
2. **ESLint hang**: `.eslintcache` buzuq bo'lsa `eslint` 0% CPU'da osilib qoladi. Yechim: `rm -f .eslintcache` + direct `node node_modules/eslint/bin/eslint.js`.
3. **tsc hang**: eski `tsconfig.tsbuildinfo` bilan `npx tsc --noEmit` osilib qolishi mumkin — eski tsbuildinfo'larni o'chirib `--incremental false` bilan ishga tushiring.
4. **`.next` keshi buzilganda homepage bo'sh chiqadi (MUHIM!)**: `unstable_cache` (getCachedHomepageProducts, getCachedRootCategories, getCachedFlashDeals) transient Neon DB xatosi paytida `[]` qaytaradi va bu **keshlanadi** (3600s). Natijada homepage'da "Ommabop mahsulotlar" bo'limida "Topilmadi", kategoriyalar/chegirmalar bo'sh bo'ladi — lekin mahsulotlar DB'da bor (to'g'ridan-to'g'ri Prisma query 6 ta qaytaradi). **Yechim**: `rm -rf .next` (butun .next, faqat .next/cache emas) + dev server'ni qayta ishga tushirish. Kod darajasida fix: unstable_cache funksiyalari xatoda `[]` qaytarib keshlash o'rniga rethrow qilishi kerak (hali qilinmagan).
5. **Click payment** aktiv emas — env yo'q.
6. **Rate limit (Upstash)** disabled — env yo'q.
7. **`otp-store.ts`** in-memory — server restart'da email OTP yo'qoladi.
8. **OTP console'da log** qilinadi (dev uchun qulay, prod'da olib tashlash kerak).
9. **Order-success/track'da hardcoded o'zbek matnlari** — i18n qilish keyingi iteratsiyada.
10. **Katalog juda kichik** (6 mahsulot, 1 root kategoriya) — filter/sort ishlaydi lekin kichik natija.
11. **Neon PostgreSQL** transient connection "Closed" xatolari — prisma qayta ulanishga urinadi.
12. **Category sahifasida `useMediaQuery`** — mobil/desktop switch'da bir kadr flash mumkin (SSR desktop render).
13. **Variant DB constraint**: `@@unique([cartId, productId])` — variant mahsulotlar DB cart'da bitta qator sifatida saqlanadi (localStorage cart'da id+variant bo'yicha alohida). To'liq variant support uchun schema kengaytirish kerak.
14. **Hozircha variantli mahsulot yo'q** — variant kodi to'liq, lekin real data bo'lmagani sababli variant UI ko'rinmaydi.

## Important Decisions

- Node 22 LTS dev uchun standart (Node 25 ishlamaydi).
- `turbopack.root: __dirname` next.config.ts'da pin qilingan (home'dagi package fayl kompilyatsiyani oshtirardi).
- Middleware `src/proxy.ts` (Next.js 16 konventsiyasi, `src/middleware.ts` emas).
- `/admin` va `/print` locale prefiksasiz.
- Prisma singleton key: `hadaf_prisma_v3`.
- Parollar argon2; JWT session.
- Telefon OTP `VerificationToken` jadvalida.
- **Checkout Click oqimi**: savat to'lovdan oldin tozalanmaydi; `order-success` sahifasi buyurtma tasdiqlanganda tozalaydi.
- **Idempotency**: `Order.idempotencyKey` String? + `@@unique([userId, idempotencyKey])`. Client `crypto.randomUUID()` — bitta checkout intent uchun barqaror. Savat mazmuni o'zgarsa → yangi key. Server `findFirst{userId, idempotencyKey}` → mavjud orderni qaytaradi. Race condition → P2002 → fetch existing. Click dedupe'da paymentUrl qayta generatsiya qilinadi (agar PAID bo'lmasa). Legacy orderlar (null key) buzilmaydi.
- **Homepage**: `getCachedHomepageProducts(24)` — butun katalog emas, alohida kesh kaliti (`homepage-products`), bir xil `['products']` tag. Boshqa bo'limlar ham alohida kesh kaliti bilan: `flash-deals`, `homepage-categories` (barchasi 3600s + `['products']`/`['categories']` tag).
- **Homepage ierarxiya**: Hero → Kategoriyalar → Chegirmalar → Ommabop (yagona h1) → Nega HADAF → Footer. Bo'sh bo'limlar (real data yo'q) yashiriladi.
- **Search API**: `/api/products` — backward-compatible; `q` bo'lsa `{ products, total, page, limit, totalPages }`, bo'lmasa eski array. `categoryId` (eski FK) va `category` (slug) alohida ishlaydi. `/search` sahifasi noindex.
- **Product page**: `fetchProduct` `React.cache()` bilan deduplicate (double-fetch yo'q); `ProductContent initialProduct` prop oladi. Product JSON-LD (Organization/WebSite + Product) server'da render.
- **Variant data flow**: `Product.attributes` JSON array spec → `selectedOptions` → `JSON.stringify` → `CartItem.variant` (localStorage + DB) → checkout payload → `OrderItem.variant`. Minimal migration (2 String? maydon). Cart identity = `productId + variant` (`cartItemKey`).
- **Cart price**: `oldPrice` cart item'da; `discount()` = `(oldPrice - price) * qty` (faqat oldPrice > price). `total()` = sum(price*qty). Chegirma qatori faqat real savings > 0 bo'lsa ko'rsatiladi.
- **Delivery**: `deliveryAvailable` state — zone topilmasa "Mavjud emas", submit bloklanadi (fake FREE yo'q). Zone topilsa fee yoki haqiqiy FREE.
- **Backend order validation**: server'dan price/title/image, mavjud bo'lmagan product rad etiladi, stock tekshiriladi, 30s idempotency dedupe. Client total authoritative emas.
- **Canonical**: `SITE_URL` fallback `https://www.alhadaf.uz`; `NEXT_PUBLIC_APP_URL` env orqali override.
- `delivery-app/` alohida standalone Express ilova — Next.js'dan mustaqil.

## Database Status

- Provider: PostgreSQL (Neon, masofaviy) — `DATABASE_URL` `.env` da.
- 33 model + 2 enum (`BannerPosition`, `BannerEventType`).
- **Phase 4 migratsiya**: `CartItem.variant` va `OrderItem.variant` (String?, nullable) qo'shildi va `prisma db push` bilan DB'ga qo'llandi.
- **Idempotency migratsiya**: `Order.idempotencyKey` (String?) + `@@unique([userId, idempotencyKey])` — xavfsiz SQL orqali qo'llandi (`--accept-data-loss` ishlatilmadi). Legacy orderlar (null key) saqlanadi.
- `prisma/schema.prisma` da **uncommitted** o'zgarish (`BannerEvent` modeli) — DB'ga hali push qilinmagan bo'lishi mumkin.
- Build script: `prisma db push --accept-data-loss && next build`.

## API Status

- ~110 route fayl `src/app/api/` da.
- Public: products, categories, banners, cart, orders, addresses, coupons, payment-methods, settings, chat, auth, telegram webhook, payment/click, upload, geocode, stores, reviews.
- Admin (`/api/admin/*`): role tekshiruvli.
- `revalidatePath` faqat admin orders assign/auto-dispatch'da.
- Data-cache deyarli yo'q; `unstable_cache` `lib/data.ts` da (products/banners).

## Last Updated

2026-08-21
