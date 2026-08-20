import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// ---------------------------------------------------------------------------
// Security headers (helmet-like defense-in-depth layer)
// ---------------------------------------------------------------------------
const isDev = process.env.NODE_ENV === "development";

const cspHeader = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
  // 'unsafe-inline' is required by Next.js itself (hydration/bootstrap scripts
  // and next/font styles) unless nonces are used. Nonces would force every page
  // into dynamic rendering, killing static optimization + CDN caching, so we
  // keep static rendering and lock down everything else instead.
  // 'wasm-unsafe-eval' — dotlottie (admin 2FA animatsiyasi) WebAssembly ishlatadi.
  "script-src 'self' 'unsafe-inline'" +
    (isDev ? " 'unsafe-eval'" : " 'wasm-unsafe-eval'") +
    " https://telegram.org https://api-maps.yandex.ru" +
    " https://*.yandex.ru https://*.yandex.net https://yastatic.net https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com" +
    " https://*.yandex.ru https://*.yandex.net https://yastatic.net",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:" +
    " https://lh3.googleusercontent.com https://images.samsung.com https://placehold.co" +
    " https://ui-avatars.com https://olcha.uz https://mi-store.uz https://fdn2.gsmarena.com" +
    " https://res.cloudinary.com https://*.public.blob.vercel-storage.com" +
    " https://asaxiy.uz https://assets.asaxiy.uz https://api.qrserver.com" +
    " https://grainy-gradients.vercel.app https://*.yandex.ru https://*.yandex.net https://yastatic.net",
  "connect-src 'self' https://lottie.host https://ipapi.co" +
    " https://o4511251276955648.ingest.de.sentry.io https://hadaf-la.sentry.io" +
    " https://geocode-maps.yandex.ru https://*.yandex.ru https://*.yandex.net https://yastatic.net" +
    (isDev ? " ws://localhost:3000" : ""),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob: data:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=()" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root: a stray package-lock.json in the home
  // directory makes Next.js infer the wrong root, hanging page compilation.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.samsung.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'olcha.uz',
      },
      {
        protocol: 'https',
        hostname: 'mi-store.uz',
      },
      {
        protocol: 'https',
        hostname: 'fdn2.gsmarena.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

// NextJS and Sentry configuration wrap
export default withSentryConfig(withPWA(withNextIntl(nextConfig)), {
  org: "hadaf-la",
  project: "sentry-chestnut-bridge",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
