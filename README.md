# Hadaf Market

O'zbekiston bozori (Surxondaryo, Termiz) uchun zamonaviy onlayn savdo platformasi. Next.js 16, PostgreSQL, PWA, Telegram botlar bilan integratsiyalashgan.

## Loyiha tuzilishi

```
src/
├── app/
│   ├── (root)/[locale]/   # Public sahifalar (i18n bilan)
│   ├── (admin)/admin/     # Admin panel (localizatsiya qilinmaydi)
│   ├── print/             # Invoice/print (localizatsiya qilinmaydi)
│   └── api/               # REST API (~110 route)
├── components/            # UI komponentlar
├── lib/                   # Biznes-logika, prisma, security, telegram
├── services/              # Order, Dispatch, Notification, Analytics, QR
├── providers/             # React providerlar
├── store/                 # Zustand store'lar
├── i18n/                  # next-intl konfiguratsiyasi
├── proxy.ts               # Middleware (NextAuth + next-intl)
├── auth.ts                # NextAuth konfiguratsiyasi
└── auth.config.ts         # Sayt auth sozlamalari
```

## Tez boshlash

```bash
# Node 22 LTS ishlatish (Node 25 bilan Turbopack osilib qoladi)
nvm use 22

# O'rnatish
npm install

# Prisma client sinxronlash
npx prisma generate

# Dev server
npm run dev
# -> http://localhost:3000
```

## Asosiy texnologiyalar

| Texnologiya | Versiya |
|-------------|---------|
| Next.js | 16.3.1 (App Router, Turbopack) |
| React | 19.2 |
| Database | PostgreSQL (Neon) + Prisma 5.22 |
| Auth | NextAuth v5 (JWT, OTP, Google, Telegram, WebAuthn) |
| i18n | next-intl v4 (uz/ru/en) |
| PWA | @ducanh2912/next-pwa |
| Monitoring | Sentry + Vercel Analytics/SpeedInsights |
| State | Zustand (persist localStorage), TanStack Query |
| UI | Tailwind CSS 4, framer-motion, recharts, lucide-react, sonner |

## Environment

`.env` gitignore'da — `.env.example` ga qarang. Muhim variable'lar:

| Variable | Majburiy | Izoh |
|----------|----------|------|
| `DATABASE_URL` | Ha | Neon PostgreSQL |
| `AUTH_SECRET` | Ha | NextAuth secret |
| `TELEGRAM_BOT_TOKEN` | Ha | Support/auth bot |
| `COURIER_BOT_TOKEN` | Ha | Courier bot |
| `NEXTAUTH_URL` | Ha | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Yo'q | Canonical/OG URL (default: `https://www.alhadaf.uz`) |

## Scripts

| Komanda | Izoh |
|---------|------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Prisma push + Next build |
| `npm run lint` | ESLint |
| `npm run bot` | Courier bot (polling) |
| `npm run bot:auth` | Support/auth bot (polling) |

## Muhim

- **Node 22 LTS** ishlatish kerak (Node 25 bilan Turbopack osilib qoladi).
- `.env` commit qilmaslik — `.env` masofaviy Neon DB'ga ulangan.
- `delivery-app/` alohida Express ilova — Next.js app bilan ishlamaydi.
- AI kontekst fayllari: `AGENTS.md`, `PROJECT_STATE.md`, `CHANGELOG.md`.