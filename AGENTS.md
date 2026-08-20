<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Hadaf Market (uzm)

O'zbekiston bozoriga mo'ljallangan onlayn savdo platformasi (HADAF). Asosiy mintaqa: Surxondaryo, Termiz. E-commerce tizimi: mahsulotlar, kategoriyalar, savat, buyurtmalar, kuriyer yetkazish, admin panel va Telegram botlar.

## Texnologiyalar

- **Framework**: Next.js 16.3.1 (App Router, Turbopack), React 19.2
- **Database**: PostgreSQL (Neon, masofaviy) + Prisma 5.22
- **Auth**: NextAuth v5 (JWT) — Credentials (telefon OTP / parol), Google OAuth, Telegram login, WebAuthn (biometrik), PIN
- **i18n**: next-intl v4 — uz (default), ru, en; `localePrefix: 'always'`
- **PWA**: @ducanh2912/next-pwa
- **Monitoring**: Sentry (@sentry/nextjs) + Vercel Analytics/SpeedInsights
- **Rate limit**: Upstash Redis (`UPSTASH_REDIS_REST_URL/TOKEN` yo'q bo'lsa disabled)
- **Boshqa**: TanStack Query, zod, framer-motion, recharts, sonner, react-hook-form

## Arxitektura

- `src/app/(root)/[locale]/` — mijoz (public) sahifalari, i18n bilan
- `src/app/(admin)/admin/` — admin panel, **localizatsiya qilinmaydi**
- `src/app/print/` — invoice/print sahifalari, localizatsiya qilinmaydi
- `src/app/api/` — barcha REST API marshrutlari (~110 route fayl)
- `src/proxy.ts` — **middleware** (NextAuth + next-intl); `/admin` va `/print` yo'llarida locale prefiksini olib tashlaydi. `src/middleware.ts` emas, `src/proxy.ts` (Next.js 16 konventsiyasi)
- `src/lib/` — biznes-logika: prisma client, security, telegram, click, ratelimit, otp, webauthn, seo
- `src/services/` — OrderService, DispatchService, NotificationService, AnalyticsService, QRService
- `src/components/` — UI komponentlar (Header, Footer, ProductCard, Auth, admin, ...)
- `src/providers/` — client providerlar (next-intl, React Query, Wishlist, Session)
- `src/store/` — zustand store'lar
- `src/i18n/` — next-intl konfiguratsiyasi
- `prisma/` — schema.prisma, migrations, seed
- `scripts/` — o'rnatish, seed va debug util skriptlar (30+)
- `messages/` — i18n JSON (uz.json, ru.json, en.json) — 29 namespace
- `delivery-app/` — **alohida** standalone Express ilova (kuriyer delivery). Next.js app bilan ishlamaydi, unga tegmang

## Database (Prisma)

- Provider: **postgresql**; `DATABASE_URL` masofaviy Neon DB'ga ulangan. **Lokal SQLite emas** (`.env.example` eskirgan, SQLite ko'rsatadi).
- 33 model + 2 enum (`BannerPosition`, `BannerEventType`): User, CourierProfile, CourierApplication, MerchantProfile, Order, DispatchLog, Earning, Account, Session, Device, Authenticator, VerificationToken, Address, TelegramLoginToken, OrderItem, Product, Category, Banner, BannerEvent, Review, StoreSettings, ActivityLog, Cart, CartItem, Wishlist, WishlistItem, Message, Notification, Store, PaymentMethod, PaymentLog, ShippingZone, Coupon.
- Prisma client singleton: `src/lib/prisma.ts` (global kalit `hadaf_prisma_v3` — hot-reload'da ko'p client yaratilmasligi uchun).
- Schema o'zgartirilganda: `npx prisma generate`; lokal DB sync: `npx prisma db push`. Build script: `prisma db push --accept-data-loss && next build`.

## API

- **Public**: `/api/products`, `/api/categories`, `/api/banners`, `/api/cart`, `/api/orders`, `/api/addresses`, `/api/coupons/validate`, `/api/payment-methods`, `/api/settings`, `/api/chat/*`, `/api/auth/*`, `/api/telegram/webhook`, `/api/telegram/courier`, `/api/payment/click`, `/api/upload`, `/api/geocode`, `/api/stores`, `/api/reviews`, `/api/delivery/*`, `/api/courier/scan`, `/api/reports/*`.
- **Admin** (`/api/admin/*`): users, orders, products, categories, banners, coupons, couriers, messages, reviews, stores, shipping, payments, settings, db-fix, notifications, analytics, dispatch, 2fa — `session.user.role === 'ADMIN'` tekshiruvli.
- To'liq ro'yxat uchun `src/app/api/` papkasiga qarang.

## Authentication

- NextAuth v5, JWT session. Providerlar: Credentials (telefon+OTP yoki parol), Google, Telegram deep-link, WebAuthn passkey. Qo'shimcha PIN-tizim.
- `src/auth.ts` — handlers, callbacks, providers. `src/auth.config.ts` — `authorized()` (profile/checkout/admin himoyasi).
- OTP: telefon OTP → `VerificationToken` jadvali; email OTP → `src/lib/otp-store.ts` (in-memory, restart'da yo'qoladi).
- Xavfsizlik: argon2 parollar, pinHash, failedAttempts/lockedUntil, Device trust + fingerprint, riskScore, ActivityLog audit.
- Admin 2FA: Telegram orqali Approve/Block (`VerificationToken` da `admin_2fa_{userId}`).

## Telegram Botlar

- **Support/Auth bot** (`TELEGRAM_BOT_TOKEN`, `Hadaf_supportbot`): OTP yetkazish, parol reset, support chat, kuriyer ariza, admin 2FA. Webhook: `/api/telegram/webhook`; polling: `npm run bot:auth` (`scripts/auth-bot.mjs`).
- **Courier bot** (`COURIER_BOT_TOKEN`, `hadaf_market_bot`): kuriyer registratsiya wizardi, buyurtma qabul qilish/photo tasdiq, lokatsiya, hisob. Webhook: `/api/telegram/courier`; polling: `npm run bot` (`scripts/courier-bot-local.mjs`).
- Yordamchi: `src/lib/telegram-bot.ts` (`sendTelegramMessage`), `src/lib/telegram-auth.ts` (login hash tekshiruvi), `src/lib/telegram-file.ts`, `/api/admin/telegram-photo/[fileId]` (bot tokenni yashirib proxy).

## Admin panel

- `src/app/(admin)/admin/` — orders, products, categories, banners, coupons, users, couriers, chat, messages, reviews, stores, shipping, payments, settings, db-fix, notifications, invoices, delivery, bot-debug.
- Himoya: NextAuth `authorized()` + API'larda role tekshiruvi + admin 2FA (Telegram).

## Payment

- **Click**: `src/lib/click.ts` + `/api/payment/click` webhook. `CLICK_SERVICE_ID` / `CLICK_SECRET_KEY` talab qiladi — hozir `.env` da **yo'q** (faol emas).
- **P2P** (karta o'tkazma): `/api/orders/[id]/payment-p2p`; karta ma'lumotlari `StoreSettings` da.
- **Telegram Payments**: `TELEGRAM_PAYMENT_TOKEN` (TEST) — hali to'liq ishlatilmaydi.
- Modellar: `PaymentMethod`, `PaymentLog`.

## Cache

- Data-cache deyarli yo'q — to'g'ridan-to'g'ri Prisma query. `revalidatePath` faqat admin order assign / auto-dispatch'da.
- Rate limit: Upstash Redis (env yo'q bo'lsa disabled, `checkRateLimit` true qaytaradi).
- Image cache: `minimumCacheTTL: 60`.

## i18n

- next-intl v4; locale: `uz` (default), `ru`, `en`; `localePrefix: 'always'`.
- Fayllar: `messages/{uz,ru,en}.json` (29 namespace: Meta, Header, Hero, Cart, Checkout, Auth, Product, ...).
- Konfig: `src/i18n/request.ts`, `src/navigation.ts`; middleware: `src/proxy.ts`.

## PWA

- @ducanh2912/next-pwa; manifest: `public/manifest.json` (Hadaf Market). Dev'da disabled. Service worker build vaqtida generatsiya qilinadi (`public/sw.js`).

## Development qoidalari

- **Node 22 LTS ishlating** (`nvm use 22`). **Node 25 bilan Turbopack kompilyatsiyasi osilib qoladi** ("Compiling instrumentation" da).
- Dev server: `npm run dev` (port 3000). Birinchi kompilyatsiya sekin (30s gacha) — sabr qiling.
- `.env` gitignore'da — lokalda mavjud, lekin **commit qilmang**. `.env` masofaviy Neon DB'ga ulangan, shuning uchun lokal ishlash ham DB'ga ulanishni talab qiladi.
- Prisma client sinxronlash: `npx prisma generate`.
- Sekin/suzuvchan narsalarni tekshirish uchun `scripts/` dagi debug skriptlardan foydalanish mumkin.

## Muhim environment variable'lar

- **Majburiy**: `DATABASE_URL` (Neon PostgreSQL), `AUTH_SECRET`, `TELEGRAM_BOT_TOKEN`, `COURIER_BOT_TOKEN`, `NEXTAUTH_URL`/`AUTH_URL`.
- **Opsional**: `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `GOOGLE_MAPS_API_KEY`, `YANDEX_MAPS_API_KEY`, `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY`, `UPSTASH_REDIS_REST_URL/TOKEN`, `NEXT_PUBLIC_CLOUDINARY_*`, `TELEGRAM_PAYMENT_TOKEN`.
- To'liq ro'yxat: kodda `process.env` ni qidiring. `.env.example` eskirgan.

## Test va verification

- **Lint**: `npm run lint` — kod yozgandan keyin albatta ishga tushiring.
- **Type check**: `npx tsc --noEmit`.
- **Build**: `npm run build` (Prisma push + Next build) — imkon bo'lsa.
- Dedicated unit/integration test framework yo'q — verification = lint + tsc + build + API/sahifa tekshiruvi.

## AI Workflow (majburiy)

**Har bir task boshlanishidan oldin:**
1. AGENTS.md ni o'qing (shu fayl).
2. PROJECT_STATE.md ni o'qing — hozirgi holat, in-progress ishlar, known issues.
3. Zarur bo'lsa CHANGELOG.md ning oxirgi yozuvlarini ko'ring.
4. Keyin relevant source code'ni tekshiring.
5. **Hech qachon taxmin qilib kod yozmang** — faktlarni kod/DB'dan tekshiring.

**Har bir task tugagandan keyin:**
1. O'zgartirilgan kodni tekshiring (`git diff`).
2. `npm run lint` (+ imkon bo'lsa `npx tsc --noEmit`, `npm run build`) ishga tushiring.
3. PROJECT_STATE.md ni yangilang (Completed Recently, In Progress, Known Issues, Last Updated).
4. Muhim o'zgarish bo'lsa (funksional, database, architecture, bug-fix, configuration) CHANGELOG.md ga yozuv qo'shing: sana, o'zgarish, sabab, muhim fayllar, verification.
5. Tugallanmagan ishlar va muammolarni PROJECT_STATE.md ga yozing.
6. Hujjatlarda mavjud kodga zid ma'lumot qoldirmang — dokumentatsiyani kod bilan sinxron saqlang.
