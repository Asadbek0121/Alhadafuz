# Changelog — Hadaf Market (uzm)

Qoida: har bir muhim funksional, database, architecture, bug-fix yoki configuration o'zgarishidan keyin AI CHANGELOG'ni yangilaydi (har kichik o'zgarish emas). Format: [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **Phase D — Category Attribute Definition Admin UI**:
  - **Yangi route**: `/admin/categories/[id]/attributes/page.tsx` — category attribute definitions boshqaruv sahifasi (CRUD). `/admin/categories/[id]/page.tsx` → attributes ga `redirect()` (404 o'rniga). Product Builder'dagi "Kategoriya xususiyatlarini boshqarish" linklari (`UniversalProductSections.tsx:499,535`) endi shu real route'ga ishora qiladi (avval `/admin/categories/${categoryId}` 404 berardi).
  - **CRUD UI**: `DefinitionForm.tsx` — 8 attribute type (TEXT/NUMBER/BOOLEAN/SELECT/MULTI_SELECT/COLOR/MEASUREMENT/DATE). Type'ga qarab dinamik maydonlar: SELECT/MULTI_SELECT/COLOR → Options (COLOR #HEX), MEASUREMENT → Unit, NUMBER → Min/Max. Required / "Variant turi" (forVariant) checkbox'lar, Order. Frontend `validateDefinitionTypeCombo` + backend authoritative; duplicate name → 409 xato ko'rsatiladi. POST create / PATCH edit / DELETE.
  - **Definition list**: order bo'yicha sort, label/type/required/variant badge'lari, options/unit/min/max meta, Edit/Delete tugmalari. Qalambooks va boshqa kategoriyalar uchun xususiyatlar qo'shish imkoni.
  - **Kategoriya ro'yxat navigatsiya**: `admin/categories/page.tsx` (tree+list) har bir kategoriyaga ⚙️ "Xususiyatlarni boshqarish" tugmasi qo'shildi.
  - **Test data**: Qalambooks root kategoriyasiga (`cmo7j45hj0001ce6n7qnkascd`) 7 ta real definition DB'ga insert qilindi (Muallif TEXT required, Nashriyot TEXT, Til SELECT, Sahifa soni NUMBER min1/max10000, Muqova SELECT, ISBN TEXT, Nashr yili NUMBER) — forVariant=false.
  - DB schema o'zgarmadi — yangi migration YO'Q.

- **Phase C — Universal Product Admin UI**:
  - **Dynamic attributes**: `src/components/admin/product/AttributeFields.tsx` — 8 attribute type (TEXT/NUMBER/BOOLEAN/SELECT/MULTI_SELECT/COLOR/MEASUREMENT/DATE) uchun UI, category tanlanganda backend'dan yuklanadi, required yulduzchali, frontend validation, extras (legacy) read-only.
  - **Variant builder**: `src/components/admin/product/VariantEditor.tsx` — forVariant definition'lar asosida variant o'qlari (axes), values comma-input, kartezian kombinatsiya generator (duplicate + deletedKey skip), 50/batch chunk render + "Ko'proq ko'rsatish".
  - **Variant table**: editable row (SKU/Barcode/Price/OldPrice/Stock/Weight/Default radio/Active), images thumbnail+count tugma → drawer, delete row.
  - **Variant images drawer**: upload (`/api/upload`), delete, reorder (left/right), primary radio (per variant).
  - **Orchestrator**: `src/components/admin/product/UniversalProductSections.tsx` — defs yuklash (category endpoint / product attributes endpoint), values/axes/variants state management, forwardRef bilan `validate()` + `saveAttributesAndVariants(productId)` API.
  - **Save sequence** (safe): 1. product POST/PUT (legacy JSON atributlar hali ham yoziladi), 2. `PUT /api/admin/products/[id]/attributes` (bulk structured), 3. variants create/update/delete (diff-based), 4. variant images create/update/delete. Partial failure'da `createdId` state → qayta bosish PUT bo'ladi (duplicate emas).
  - **Integration**: `new/page.tsx` va `[id]/page.tsx` ga qo'shildi — mavjud variatsiyalar (free-form attributes) saqlanadi; universal card always open (state yo'qotilmasligi uchun). CHINA_ORDER info block mavjud. Legacy book flow (attributes JSON, single category, images) saqlanadi. Category o'zgarishida warning banner.
  - **Helper types**: `src/components/admin/product/types.ts` — AttributeDef, VariantAxis, VariantRow, parseVariantKey.
  - Yangi migration KERAK EMAS (`prisma/schema.prisma` ga tegilmladi). DB schema o'zgarmadi.

- **Phase B — Backend CRUD & Validation (universal product system)**:
  - **Category Attribute Definitions CRUD**: `GET/POST /api/admin/categories/[id]/attributes`, `PATCH/DELETE .../[attributeId]` — ADMIN rol tekshiruvi, category ownership tekshiruvi (boshqa category definition'ini tahrirlash 404), type/options kombinatsiya validatsiyasi (TEXT/BOOLEAN/DATE options yo'q; SELECT/MULTI_SELECT options shart; COLOR #HEX format; NUMBER/MEASUREMENT min/max; MEASUREMENT unit tavsiya), name unique per category (409). Zod.
  - **Product Attribute Values**: `GET/PUT /api/admin/products/[id]/attributes` — bulk replace (transaction: deleteMany+createMany). Definition product'ning category'iga tegishli bo'lishi shart (400), `required=true` tekshiruvi, type asosida qiymat validatsiyasi (TEXT/NUMBER/BOOLEAN/SELECT/MULTI_SELECT/COLOR/MEASUREMENT/DATE), `@@unique([productId, attributeDefId])` — P2002 → 409. VALUE storage: `ProductAttributeValue.value` = JSON.stringify qiymat, deserialize/read uchun helper.
  - **Product Variants CRUD**: `GET/POST /api/admin/products/[id]/variants`, `PATCH/DELETE .../[variantId]` — `variantKey` deterministik kanonik (`color=black|size=m`; kalitlar lexicographic sort, qiymatlar trim+lowercase; `@@unique([productId, variantKey])` → P2002 → 409, 500 EMAS). `variantLabel` readable label ("Black / M") options'dan generatsiya. `isDefault` transaction bilan yagona (eski default false). PATCH uchun default'siz `variantPatchSchema` (`.partial()` default'li schema'da default'larni qo'llardi — bug fix).
  - **Variant Images CRUD**: `GET/POST .../variants/[variantId]/images`, `PATCH/DELETE .../images/[imageId]` — metadata-only (upload yo'q), `order` reorder, `isPrimary` transaction bilan yagona (yangisi set qilinsa eski false).
  - **CHINA_ORDER ziddiyat qoidasi**: `resolveFulfillmentConflict` — Product CHINA_ORDER bo'lsa variant LOCAL bo'la olmaydi (400); Product LOCAL bo'lsa variant CHINA_ORDER override qila oladi; variant.fulfillmentType null bo'lsa product'dan inherit. Variant override qila oladi, lekin product CHINA_ORDER → variant faqat CHINA_ORDER yoki null.
  - **Public Product API kengaytirildi** (`/api/products/[id]`): legacy `attributes`/`variant` response'lari SAQLANADI, qo'shimcha `attributeValues` (structured) va `variants` (isActive, images bilan, price/stock fallback Product'ga) qo'shildi. `mapProductMarketing`/`lib/data.ts` buzilmadi.
  - Shared helper: `src/lib/universal-product.ts` (zod schemas, variantKey/label generatsiya, type combo validatsiya, value validatsiya, serialize/deserialize, fulfillment qoidasi).
- Yangi migration KERAK EMAS — Phase A migration `20260821060000_add_universal_product_system` yetarli.
- 🇨🇳 **Xitoydan buyurtma (CHINA_ORDER fulfillment)** — boshidan oxirigacha fulfillment modeli:
  - **DB**: `Product.fulfillmentType String @default("LOCAL")` (authoritative), `CartItem.fulfillmentType`/`OrderItem.fulfillmentType` (snapshot, nullable), yangi `Cargo` modeli (PENDING/CALCULATED/PAID — future placeholder, hozir real calculator yo'q). Migration `20260821051422_china_order_fulfillment`.
  - **Product card**: CHINA_ORDER qizil badge "🇨🇳 BUYURTMA ASOSIDA" + "Kargo alohida hisoblanadi" izohi. LOCAL'da bepul yetkazib berish badge'si o'chadi.
  - **Product detail**: qizil info blok — "Narx 100% oldindan to'lanadi", "Kargo alohida", delivery row "Kargo keyin hisoblanadi".
  - **Cart/CartDrawer**: CHINA_ORDER badge + item izohi; summary'da "Kargo alohida hisoblanadi".
  - **Checkout**: "Hozir to'lanadi" label (Jami o'rniga), "Kargo keyin hisoblanadi" qatori, mobil sticky CTA'da ham.
  - **Order**: `OrderItem.fulfillmentType` snapshot server authoritative price bilan (client total ishonilmaydi).
  - **Admin**: product form'da "Sotuv turi" radio (Oddiy / 🇨🇳 Xitoydan), order detail'da "China Order · Cargo keyin" badge + Cargo status card (Product paid YES, status).
  - **Profile orders + invoice**: CHINA_ORDER badge, "Kargo hisoblanmoqda" qatori.
  - **i18n**: yangi `ChinaOrder` namespace — uz/ru/en.
  - **Backward compat**: eski productlar LOCAL, eski cart/order itemlar `null` → kod `LOCAL` deb hisoblaydi.
- `BannerEvent` modeli (vaqt-belgili impression/click jurnali) schema'ga qo'shildi — `db push` kutilmoqda.

### Fixed
- **Vercel build P1002 (4-chi tuzatish)**: `prepare-direct-url.mjs` endi `prisma migrate deploy` ni `execSync` orqali O'Z ICHIDA ishga tushiradi. Sabab: `process.env.DIRECT_URL` (true direct host) faqat node process'ida qoladi, shell'da `&& prisma migrate deploy` alohida process'ga o'tmaydi. `.env` fayli esa Vercel env var'idan past priority. Endi `process.env.DIRECT_URL` to'g'ri child process'ga meros qilib beriladi. (`scripts/prepare-direct-url.mjs`, `package.json`)

## [2026-08-20] — Production Remediation (B1/B2/H1/H3/H4/P6/P7/P8/P9)

### Fixed
- **B2 Prisma migration**: SQLite migrationlar postgres uchun yaroqsiz edi — olib tashlandi. Yangi Postgres baseline `20260820000000_init_postgres` (820 qator SQL: variant, idempotencyKey+unique, BannerEvent, barcha jadval/enum). `directUrl = env("DIRECT_URL")` — Neon+PgBouncer advisory lock fix. Build script → `prisma migrate deploy && next build`. (`prisma/schema.prisma`, `prisma/migrations/`, `package.json`)
- **B1 Click env**: `.env.example` ga `CLICK_SERVICE_ID`/`CLICK_SECRET_KEY` placeholder (haqiqiy secret emas).
- **H1 Rate limit**: `auth/[...nextauth]` POST'ga `checkRateLimit` (brute-force). Upstash placeholder `.env.example`.
- **H3 Tracking privacy**: courier phone anonymous'ga maskalangan (`maskPhone`), faqat owner/ADMIN to'liq. (`track/route.ts`)
- **H4 Error exposure**: `stack`/`details: error.message` 12+ API route'dan tozalandi → generic. Validation errorlar saqlandi.
- **P6 Config**: `.env.example` to'liq yangilandi (Click/Upstash/WebAuthn/Telegram/Yandex/DIRECT_URL). Yandex Maps key 7 fayldan `NEXT_PUBLIC_YANDEX_MAPS_KEY` + `src/lib/maps.ts` ga ko'chirildi.
- **DIRECT_URL**: `.env` va `.env.example` ga qo'shildi (Neon direct connection, pgbouncersiz).

### Verified
- `npm run build` — SUCCESS: `migrate deploy` ✓, next build ✓ (101/101 static, 176 routes). Upstash env yo'q warning (kutilgan).
- `npx tsc --noEmit` — 0 xato. ESLint — 0 xato.
- P8 security smoke: admin API 401, invalid product 404, unauth orders 401, generic errors ✓.
- P9 production routes: `/uz/ru/en`, search, category, product, cart, checkout, order-success, track, favorites, robots, sitemap — ALL 200.

## [2026-08-20] — Phase 11: Production Readiness Audit

Audit o'tkazildi — kod o'zgartirilmadi. Xulosa:

**BLOCKER:**
- Click payment env (`CLICK_SERVICE_ID`/`CLICK_SECRET_KEY`) `.env` da yo'q — Click to'lovi faol emas.
- Build script `prisma db push --accept-data-loss` — production'da data-loss xavfi. `prisma migrate deploy` kerak.

**HIGH:**
- Upstash env yo'q → rate limiting disabled (auth/orders himoyasiz).
- Schema o'zgarishlari (variant, idempotencyKey, BannerEvent) commit qilinmagan, migration'lar yo'q.
- Tracking endpoint courier phone'ni public qaytaradi.
- Ba'zi API'lar server error detail'larini expose qiladi.

**MEDIUM/LOW:**
- `.env.example` eskirgan; Yandex Maps key hardcoded (3 fayl); WebAuthn/Telegram env fallback'lar.

**Positive:**
- Auth IDOR (order ownership) ✓, admin API 401 ✓, Click webhook idempotency ✓, idempotency key ✓, CSP/HSTS ✓, SEO ✓, DB sync ✓, orphan 0.

## [2026-08-20] — Phase 10: Final Accessibility & UI Polish

### Added
- **`useFocusTrap` hook** (`src/hooks/useFocusTrap.ts`): focus trap + Escape + trigger focus restore. CartDrawer'ga qo'llandi (`role="dialog"` + `aria-modal="true"`). (`CartDrawer.tsx`)
- **Hero carousel a11y**: pause/play button (`aria-pressed`), `prefers-reduced-motion` autoplay o'chirish, `role="region"` + `aria-roledescription="carousel"`, dot `aria-current`. (`Hero.tsx`, `Hero.module.css`)
- **Payment icons self-host**: `public/payme.svg`, `public/uzcard.svg`, `public/humo.svg` (asaxiy.uz CDN'dan lokalga ko'chirildi). Footer external CDN reference'idan tozalandi. (`Footer.tsx`)

### Changed
- **Checkout field a11y**: `fieldErrors` state, phone input `aria-invalid` + `aria-describedby` + inline `role="alert"` error, district error. (`checkout/page.tsx`)
- **i18n**: CartDrawer empty state (Cart namespace), MegaMenu status messages (MegaMenu namespace), `Cart.close`. (`CartDrawer.tsx`, `MegaMenu.tsx`, `messages/{uz,ru,en}.json`)
- **AuthModal**: audit — allaqachon to'liq focus trap + Escape + `role="dialog"`/`aria-modal` ga ega edi. O'zgarish kiritilmadi.

### Verified
- `npx tsc --noEmit` — 0 xato.
- ESLint (6 fayl) — 0 xato, 0 warning.
- All routes 200. Payment icons lokal 200. Cart drawer i18n ("Savatchangiz bo'sh"). Console: no new errors.
- asaxiy.uz CDN reference: 0.

## [2026-08-20] — Phase 9: Accessibility / WCAG

### Fixed
- **ProductCard wishlist**: `<div role="button">` → native `<button type="button">`. Endi Tab/Enter/Space bilan ishlaydi. `aria-pressed={activeWishlist}`, dynamic `aria-label` ("qo'shish"/"olib tashlash"). (`src/components/ProductCard/ProductCard.tsx`)
- **Product gallery lightbox**: Escape yopish, fokus close tugmasiga (ochilganda), galereyaga qaytish (yopilganda), `role="dialog"` + `aria-modal="true"` + `aria-label`. (`ProductContent.tsx`)
- **MegaMenu keyboard**: kategoriya itemlari native `<button>` (avval `<div onMouseEnter>` — keyboard bilan ishlamasdi). ArrowDown/ArrowUp kategoriyalar orasida, Escape yopadi, `role="tablist"`/`role="tab"` + `aria-selected`, `onFocus` bilan hover'ga qaramaydi. (`MegaMenu.tsx`)
- **Search combobox**: natijalar `role="listbox"` + `role="option"` + `aria-selected` + `aria-activedescendant`. (`Header.tsx`)

### Verified
- `npx tsc --noEmit` — 0 xato.
- ESLint (4 fayl) — 0 xato, 0 warning.
- All routes 200 (home, search, category, product, cart, checkout, favorites).
- Wishlist `aria-pressed` render (10 kartada), lightbox `aria-modal`, combobox roles.

### Remaining WCAG (Phase 10)
- Carousel autoplay pause (prefers-reduced-motion / pause button).
- AuthModal / CartDrawer to'liq focus trap.
- Color contrast to'liq audit (WCAG AA).
- Checkout field-level `aria-invalid` / `aria-describedby`.

## [2026-08-20] — Phase 8: SEO & Search Engine Architecture

### Added
- **robots.txt** (`src/app/robots.ts`): `/admin`, `/api`, `/auth`, `/profile`, `/checkout`, `/track`, `/search` (har locale bilan) block. `Sitemap: https://www.alhadaf.uz/sitemap.xml`. Google product/category crawl qila oladi.
- **sitemap.xml** (`src/app/sitemap.ts`): `revalidate: 3600`. Homepage (3 locale), category (2), product (6) × 3 locale = ~27 URL. DB query. Search/filter URL'lari yo'q.
- **BreadcrumbList JSON-LD**: category page (Home → Qalambooks), product page (Home → Qalambooks → Product). `breadcrumbJsonLd()` helper ishlatiladi. Locale-aware "Bosh sahifa" label.
- **Product JSON-LD aggregateRating**: faqat real `reviewsCount > 0 && rating > 0` bo'lsa qo'shiladi (fake rating yo'q).
- **WebSite SearchAction**: `potentialAction` → `/uz/search?q={search_term_string}`.

### Changed
- **Organization**: fake `sameAs` (facebook.com/instagram.com/t.me/youtube.com generic linklar) olib tashlandi — haqiqiy profillar mavjud bo'lguncha qo'shilmaydi.
- **Invoice `uzm.uz`**: `www.alhadaf.uz` ga tuzatildi (hardcoded eski domen). (`invoice/page.tsx`)

### Verified
- Canonical/og:url/hreflang: `https://www.alhadaf.uz/{locale}` — hreflang uz/ru/en + x-default (4 alternat har sahifada).
- Search: `noindex, nofollow, nocache` + canonical root (query parametrsiz).
- robots.txt: 200, plain text, sitemap reference.
- sitemap.xml: 200, valid XML, ~27 URL.
- JSON-LD valid: Organization/WebSite (home), + BreadcrumbList (category), + Product + BreadcrumbList (product).
- `npx tsc --noEmit` — 0 xato. ESLint — 0 xato.

## [2026-08-20] — Phase 7: Performance Optimization

### Fixed
- **Track polling (P0)**: `track/[id]` 10s polling endi terminal holat (DELIVERED/COMPLETED/CANCELLED) da to'xtaydi. Network error'da ham to'xtaydi — infinite retry yo'q (user "Qayta urinish" orqali qayta boshlaydi). `stopPolling()` funksiyasi, `isTerminal()` guard. (`src/app/(root)/[locale]/track/[id]/page.tsx`)

### Changed
- **Image optimization**: cart page item image → `next/image` fill (sizes 64/112px). Category banner (desktop carousel + mobile strip) → `next/image` fill (sizes 100vw/1200px/85vw). Subcategory grid image → `next/image` fill (sizes 80px). (`cart/page.tsx`, `CategoryContent.tsx`)
- **Search duplicate audit**: `useCallback` + AbortController — har param o'zgarishida 1 request (tasdiqlangan: `?q=a&sort=price_asc` → 1 API call). O'zgarish kiritilmadi.
- **Category render audit**: `useMediaQuery` (Phase 3) faqat bitta DOM render. Tasdiqlandi, o'zgarish kiritilmadi.
- **Baseline recorded**: 7 route metrics (time + HTML size + JS chunks + images). Neon DB latency (~1.8s) asosiy bottleneck.

### Verification
- `npx tsc --noEmit` — 0 xato.
- ESLint (3 fayl) — 0 xato, 0 warning.
- All routes 200 (home, search, category, cart, checkout, product, track).
- Search duplicate test: `?q=a&sort=price_asc` → 1 API call.
- Track polling: terminal state guard + network error stop.

## [2026-08-20] — Phase 6: Mobile UX

### Added
- **BottomNav**: product sahifasida endi ko'rsatiladi (avval `return null` edi — navigatsiya bo'shlig'i). Checkout'da yashirin. Safe-area `bottom-[calc(1rem+env(safe-area-inset-bottom))]`. Home active state `/en` qo'shildi. `aria-label`, `aria-current`, `aria-expanded` a11y. (`src/components/BottomNav/BottomNav.tsx`)
- **Product sticky CTA**: mobil'da BottomNav ustida (`bottom: calc(89px + env(safe-area-inset-bottom))` @<1024px, desktop `bottom: 0`). Container padding 180px (mobil). (`page.module.css`, `ProductContent.tsx`)
- **LanguageSwitcher**: mobil aylanish (UZ→RU→EN) butunlay olib tashlandi — hamma ekranlarda dropdown. `Header.language_switcher` i18n (uz/ru/en). `aria-haspopup`, `aria-expanded`, `role="menu"/"menuitemradio"`. (`src/components/LanguageSwitcher.tsx`)
- **`xs:` breakpoint**: `--breakpoint-xs: 480px` `@theme`'ga qo'shildi (Header, MapModal, profile/orders'da ishlatilgan, aniqlanmagan edi). (`src/app/globals.css`)
- **Safe-area**: `body` padding-bottom `calc(70px + env(safe-area-inset-bottom))`. (`globals.css`)
- **Filter drawer** (SearchClient): Escape yopish, `role="dialog"` `aria-modal`, body scroll lock, safe-area padding. (`SearchClient.tsx`)
- **WASM CSP**: `script-src` production'ga `'wasm-unsafe-eval'` — dotlottie WebAssembly ishlashi uchun. (`next.config.ts`)

### Verification
- `npx tsc --noEmit` — 0 xato.
- ESLint (4 fayl) — 0 xato, 0 warning.
- Dev server: `/uz`, `/uz/product/...`, `/uz/cart`, `/uz/search`, `/uz/category/...`, `/uz/checkout`, `/uz/favorites` — barchasi 200.
- Konsol: yangi hydration/React error yo'q (stale dotlottie WASM xatosi eski).

## [2026-08-20] — Idempotency: Client key + unique constraint (Option A)

### Added
- **Schema**: `Order.idempotencyKey String?` + `@@unique([userId, idempotencyKey])`. Xavfsiz SQL bilan qo'llandi (`--accept-data-loss` YO'Q). Legacy orderlar (null key) buzilmaydi — PostgreSQL NULL'lar unique index'da distinct. (`prisma/schema.prisma`)
- **Checkout**: `idempotencyKey` state — mount'da `crypto.randomUUID()` (fallback `ik_timestamp_random`). `cartFingerprint()` (id+variant+qty) o'zgarganda → yangi intent → yangi key. Retry/double-submit bir xil key yuboradi. Submit body'ga `idempotencyKey`. (`checkout/page.tsx`)
- **Orders API**: 30s heuristic (`userId+total+itemCount`) BUTUNLAY olib tashlandi. Yangi flow: (1) `findFirst{userId, idempotencyKey}` → mavjud order qaytariladi; (2) insert `idempotencyKey` bilan; (3) race → `23505`/`P2002` catch → existing order qaytariladi. `buildOrderResponse()` helper. (`src/app/api/orders/route.ts`)
- **Payment URL**: dedupe natijasida qaytarilgan Click order uchun `buildClickPaymentUrl()` — AWAITING_PAYMENT + not PAID + not CANCELLED bo'lsa paymentUrl qayta generatsiya qilinadi; PAID bo'lsa `null`. (`orders/route.ts`)
- **Security**: dedupe har doim `userId` bilan scoped — boshqa userning orderi topilmaydi; turli userlar bir xil key ishlatsa ham ruxsat.

### Verification
- `npx tsc --noEmit` — 0 xato.
- ESLint (2 fayl) — 0 xato, 0 warning.
- DB test (5 case): legacy null-key x2 OK; bir xil (userId,key) → P2002; turli user bir xil key → 2 order; findFirst topadi.
- Dev server: `/uz/cart`, `/uz/checkout`, `/uz` — 200 OK.
- Schema diff: `[+] Added column idempotencyKey`, `[+] Added unique index (userId, idempotencyKey)`.

## [2026-08-20] — Phase 5: Cart & Checkout

### Added
- **Variant merge identity**: `cartItemKey(id, variant)` — `useCartStore`'da `addToCart`/`removeFromCart`/`updateQuantity` id+variant bo'yicha. `CartItem.oldPrice` + `discount()` computed. (`src/store/useCartStore.ts`)
- **Cart hydration guard**: `isHydrated` tekshiruvi — hydration tugamaguncha empty cart ko'rsatilmaydi. (`src/app/(root)/[locale]/cart/page.tsx`)
- **Cart summary**: real discount (`savings > 0` bo'lsa ko'rsatiladi), `-0` olib tashlandi, delivery `0` o'rniga "narx buyurtma jarayonida". Hardcoded "Apple" brand olib tashlandi. (`cart/page.tsx`)
- **CartDrawer**: id+variant key, `variant` label (CSS class), `removeFromCart`/`updateQuantity` variant param. (`src/components/Cart/CartDrawer.tsx`, `CartDrawer.module.css`)
- **Checkout progress stepper**: `CheckoutStepper` — 3 bosqich, completed/current state'lar, `Check` icon, emerald/blue ranglar. (`checkout/page.tsx`)
- **Mobile sticky CTA**: `lg:hidden fixed bottom` — grand total + "To'lovga o'tish" submit, safe-area, loading/disabled, `aria-live`. Same `isProcessing` + `submittingRef` double-submit guard. (`checkout/page.tsx`)
- **Delivery fake-FREE fix**: `deliveryAvailable` state (null=true=false). Zone topilmasa "Mavjud emas" + submit bloklanadi. `delivery_unavailable` error. (`checkout/page.tsx`)
- **Order review variant display**: checkout sidebar item'da variant JSON parse → label. (`checkout/page.tsx`)
- **ProductContent**: `addToCart`'ga `oldPrice` yuboradi. (`ProductContent.tsx`)
- **Backend validation**: product topilmasa/o'chirilgan bo'lsa 400 error (client authoritative emas). 30s idempotency dedupe (bir xil total + item count). (`src/app/api/orders/route.ts`)
- **i18n**: `Checkout.delivery_calculated`, `Checkout.delivery_unavailable`, `Checkout.to_pay`.

### Verification
- `npx tsc --noEmit` — 0 xato.
- ESLint (6 fayl) — 0 xato, 0 warning.
- Dev server: `/uz/cart`, `/uz/checkout`, `/uz`, `/uz/product/...` — barchasi 200.
- Cart page: hydration guard (Loader2), real discount, delivery_calculated text.
- Checkout: mobile CTA ("To'lovga o'tish"), aria-live, stepper kod darajasida (bo'sh cart bilan curl'da ko'rinmaydi).

## [2026-08-20] — Phase 4: Product Page

### Added
- **Variant data flow (minimal migration)**: `CartItem.variant` + `OrderItem.variant` (String?, `prisma db push` qilindi). `useCartStore.CartItem` ga `variant?: string`, `addToCart` id+variant bo'yicha merge. Checkout payload + Orders API (`zod`, `finalOrderItems`, `orderItem.create`) variant uzatadi/saqlaydi. `ProductContent` `selectedOptions` JSON'ini `addToCart`'ga yuboradi. (`prisma/schema.prisma`, `src/store/useCartStore.ts`, `checkout/page.tsx`, `src/app/api/orders/route.ts`, `ProductContent.tsx`)
- **Double-fetch fix**: `fetchProduct` `React.cache()` bilan — `generateMetadata` va page bitta fetch ishlatadi. `ProductContent` endi `initialProduct` prop oladi. Tasdiqlangan: har bir product sahifasi 1 API chaqiruv. (`src/app/(root)/[locale]/product/[id]/page.tsx`)
- **Product JSON-LD**: name/image/description/sku/brand/offers (priceCurrency UZS, availability real stock asosida). Organization + WebSite + Product uchta schema. (`page.tsx`)
- **Gallery**: `next/image` (width/height/sizes/priority) main image, thumbnails lazy + keyboard accessible + rol/tabIndex, broken image fallback (placehold.co), mobil swipe (touch handlers). (`ProductContent.tsx`)
- **CTA states**: `buying` state (`'cart' | 'buy' | null`) — "Hozir sotib olish" loading, infinite loading yo'q.
- **Delivery row**: real `freeDelivery` flag yoki "narx buyurtma jarayonida hisoblanadi" (fake FREE yo'q). `Product` i18n namespace'iga 4 delivery key (uz/ru/en).

### Verification
- `npx tsc --noEmit` — 0 xato.
- ESLint (5 fayl) — 0 xato, 0 warning.
- DB: `variant` ustunlari `CartItem` va `OrderItem` da tasdiqlandi.
- Dev server: product sahifasi 200, double-fetch yo'q (1 API chaqiruv), JSON-LD Product/Organization/WebSite mavjud, gallery next/image, delivery row render.
- `/uz`, `/uz/search`, `/uz/category/...`, `/uz/product/...`, `/uz/checkout` — barchasi 200.

### Notes / Ataylab qoldirilgan
- **Installment**: `price/12` hardcoded qolmoqda — real installment data yo'q. Faqat `allowInstallment` flag bo'lsa ko'rsatiladi. To'g'ri installment Phase 5+ da (bank API).
- **Seller block**: real merchant data yo'q (vendorId null) — qo'shilmadi.
- **BreadcrumbList JSON-LD**: helper tayyor, product sahifasida hali qo'llanilmadi (category slug ierarxiyasi uchun).
- **Variant DB constraint**: `@@unique([cartId, productId])` — bir mahsulotning variantlari DB cart'da bitta qator. To'liq variant support uchun keyinroq schema kengaytirish.
- **URL slug migration** — Phase 8.

## [2026-08-20] — Phase 3: Search & Category

### Added
- **`/api/products` kengaytirildi**: `sort` (`price_asc`/`price_desc`/`newest`/`discount`), `minPrice`/`maxPrice`, `category` (slug), `discount` (checkbox), `page`/`limit` parametrlari. Backward-compatible: `q` yoki pagination parametrsiz eski array format qaytadi; `q` bilan `{ products, total, page, limit, totalPages }`. `categoryId` eski direct-FK (related products) va `category` slug alohida ishlaydi. (`src/app/api/products/route.ts`)
- **`/search` sahifasi**: URL-based state (`?q=...&sort=...&category=...`), sort dropdown, filter drawer (kategoriya, narx oralig'i, chegirma), product grid, empty/loading/error states, pagination, noindex metadata, so'nggi qidiruvlar (localStorage). (`src/app/(root)/[locale]/search/page.tsx`, `search/SearchClient.tsx`)
- **Header search upgrade**: 300ms debounce, AbortController (race condition), keyboard nav (ArrowUp/Down/Enter), `role="combobox"` + `aria-haspopup`, "Barchasini ko'rish" → `/search?q=...`, so'nggi qidiruvlar dropdown'da, search error state, `autoComplete="off"`. (`src/components/Header/Header.tsx`)
- **Kategoriya sahifasi**: URL-based sort (server Prisma), product count, `useMediaQuery` hook bilan no-double-DOM (faqat bitta DOM), o'lik "Barcha bo'limlar" → search link, mobil'da empty state, bitta impression tracking. (`src/app/(root)/[locale]/category/[slug]/page.tsx`, `CategoryContent.tsx`)
- **Yangi**: `src/hooks/useMediaQuery.ts`, `Search` i18n namespace (24 key, uz/ru/en), `Meta.search` metadata keylari.

### Verification
- `npx tsc --noEmit` — 0 xato.
- ESLint (o'zgartirilgan 8 fayl) — 0 xato, 0 warning.
- Dev server: `/uz/search`, `/uz/search?q=...`, `/uz/category/...`, `/uz/category/...?sort=price_asc` — barchasi 200 OK.
- API test: `q=a&sort=price_asc` → 6 ta (narx bo'yicha), `q=zzzzzxyz` → 0, `discount=1` → 1 ta, `minPrice=50000` → 4 ta. Backward compat: paramsiz → cached array (6 ta).
- Header: homepage 200, `role="combobox"` present.

## [2026-08-20] — Phase 2: Homepage redesign

### Added
- **Kategoriya tezkor-linklari**: `getCachedRootCategories()` (cached, 3600s, `['categories']` tag). Mobil'da horizontal scroll, desktop'da grid. `CategoryCard` komponenti. Real aktiv ildiz kategoriyalar asosida. (`src/lib/data.ts`, `src/components/Home/CategoryCard.tsx`, `src/app/(root)/[locale]/page.tsx`)
- **Flash Deals bo'limi**: `getCachedFlashDeals(8)` — `discount > 0` YOKI `oldPrice > price` mahsulotlar. Prisma ustunlararo taqqoslash qo'llab-quvvatlamagani uchun nomzodlarni olib JS'da filter qilinadi. Countdown qo'shilmadi (real expiry yo'q). (`src/lib/data.ts`, `src/app/(root)/[locale]/page.tsx`)
- **"Nega HADAF?" trust section**: `TrustSection` server komponenti — 4 real xizmat (tezkor yetkazish, qulay to'lov, kafolat, sifat). Footer namespace'idagi i18n keylari ishlatiladi. Statistika yozilmadi (DB tasdiqlamaydi). (`src/components/Home/TrustSection.tsx`, `src/app/(root)/[locale]/page.tsx`)
- **`no-scrollbar`** utility `globals.css`'ga qo'shildi (category page'da ham ishlatilgan, ammo aniqlanmagan edi). (`src/app/globals.css`)
- `Header` i18n namespace'iga `kategoriyalar`, `chegirmalar` keylari qo'shildi (uz/ru/en). (`messages/{uz,ru,en}.json`)

### Changed
- **Homepage ierarxiya**: Hero → Kategoriyalar (h2) → Chegirmalar (h2) → Ommabop mahsulotlar (h1) → Nega HADAF → Footer. Har bir bo'lim faqat real data mavjud bo'lsa ko'rsatiladi.
- **Yagona h1 saqlanadi** ("Ommabop mahsulotlar"), qolgan section sarlavhalari h2.

### Not added (ataylab)
- **New Arrivals bo'limi**: katalogda faqat 6 ta mahsulot, `getCachedHomepageProducts` allaqachon `createdAt` desc — "Popular" bilan bir xil bo'lardi. Katalog o'sganda qo'shiladi.
- **Seller/Marketplace value proposition bandi**: Footer'da "Sotuvchi bo'ling" CTA mavjud — homepage'da takrorlash keraksiz.

### Verification
- `npx tsc --noEmit` — 0 xato.
- ESLint (o'zgartirilgan fayllar) — 0 xato, 0 warning.
- Dev server: `GET /uz` — 200 OK, 0.24s response.
- Rendered HTML: `h1` "Ommabop mahsulotlar" (1×), `h2` "Kategoriyalar" (1×), `h2` "Chegirmalar" (1×), trust items (4× real footer i18n), JSON-LD Organization/WebSite present.
- Database: 6 products, 4 discounted (`oldPrice > price`), 1 root category — barcha sectionlar real data bilan to'ldirilgan.

## [2026-08-20] — Phase 1: Critical UX fixes

### Fixed
- **Checkout Click cart bug**: savat to'lovga o'tishdan OLDIN bo'shatilardi — endi `order-success` sahifasida buyurtma tasdiqlangandan keyin tozalanadi. Foydalanuvchi to'lovni bekor qilsa savat saqlanib qoladi. (`src/app/(root)/[locale]/checkout/page.tsx`, `order-success/page.tsx`)
- **Order-success cheksiz spinner**: `orderId` bo'lmasa yoki buyurtma topilmasa endi empty state + "Bosh sahifa" CTA ko'rsatiladi. (`src/app/(root)/[locale]/order-success/page.tsx`)
- **Track page network error spinner**: catch blokida `loading` yakunlanadi; "Aloqa uzildi" state + "Qayta urinish" (retry) qo'shildi. Debug `console.log` olib tashlandi. (`src/app/(root)/[locale]/track/[id]/page.tsx`)
- **Homepage performance**: butun katalog o'rniga `getCachedHomepageProducts(24)` cheklovi; alohida kesh kaliti (`homepage-products`, bir xil `['products']` tag). "Barchasini ko'rish" CTA katalog menyusini ochadi. Bo'sh mahsulot holati qo'shildi. (`src/lib/data.ts`, `src/app/(root)/[locale]/page.tsx`, `src/components/Home/ViewMoreButton.tsx` — yangi)

### Changed
- **SEO foundation**: homepage'da `<h1>`, layout'da `<main>` semantic landmark, JSON-LD (Organization + WebSite) `src/app/(root)/[locale]/layout.tsx` da; `breadcrumbJsonLd()` helper `src/lib/seo.ts` da (kategoriya/mahsulot sahifalarida qo'llash uchun foundation).
- **Canonical/OG URL**: `SITE_URL` fallback `https://uzm.uz` → `https://www.alhadaf.uz` (real domen). (`src/lib/seo.ts`, `src/app/api/admin/orders/create/route.ts`, `.env`, `.env.example`)

### Verification
- `npx tsc --noEmit` — 0 xato.
- ESLint (o'zgartirilgan 9 fayl) — 0 xato.
- Dev server: `/uz`, `/uz/track/*`, `/uz/order-success`, `/uz/checkout` — 200 OK.
- Rendered HTML: `<h1>` mavjud, `<main>` mavjud, JSON-LD Organization `https://www.alhadaf.uz`, canonical/og:url to'g'ri.

### Notes / Ataylab qoldirilgan
- Product JSON-LD SEO fazasiga qoldirildi (server wrapper `ProductContent`'ga ma'lumot uzatmaydi — qo'shimcha fetch talab qiladi).
- Variant→savat, search, checkout redesign, seller blok, mobile navigation — Phase 2+.

## 2026-08-19/20 (avvalgi sessiyalar)

- Admin panel auditi: xom SQL, kesh va reyting nuqsonlari tuzatildi.
- Telegram botdan kelgan xabarlar admin panelda ko'rinadigan bo'ldi.
- `ActivityLog.adminId` nuqsoni (mahsulot o'chirish 500) tuzatildi.
- Chegirma faqat admin belgilaganda ko'rinadigan bo'ldi; karta rasmi kattalashtirildi.
- Sahifa tezligi: CLS 0.64 → 0.0008, lazy modal, lokal Lottie.
- `(root)/[locale]/layout.tsx`: `<Script>` client komponent ichidan tashqariga ko'chirildi (konsol xatosi).
- Platforma Surxondaryo/Termizga markazlashdi.

## 2026-04 (Next.js 16 migratsiya)

- Next.js 16 migratsiyasi, Home page optimizatsiyasi, cache consistency.
- TTFB va API caching optimizatsiyalari, 90+ score maqsadi, next/image optimizatsiyasi.
- WOW Splash Screen, Telegram Webhook API, Sentry integratsiyasi.
- Hydration mismatch'lar (Hero, Home) tuzatildi.

## 2026-02 (Enterprise auth, logistika)

- Enterprise auth: Argon2id, device trust, biometrik (WebAuthn) login, Telegram auto-login.
- Enterprise logistika markazi, smart dispatch, Google satellite maps.
- Live tracking, auto-dispatch, PDF invoicing, courier bot webhook.
- To'liq lokalizatsiya, PWA (Hadaf Market), shipping API.

## 2025-12 (Boshlanish)

- create-next-app asosida boshlangan, PostgreSQL migratsiyasi.
- Unified chat + Telegram bot integratsiyasi, parol reset (OTP), Resend email, Telegram deep-link login.
- Auth UI qayta dizayni (login/register/auth modal).
