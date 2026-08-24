// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import type { Metadata } from "next";
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from "next/navigation";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import BottomNav from "@/components/BottomNav/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import SupportChat from "@/components/SupportChat/SupportChat";
import SessionSync from "@/components/SessionSync";
import { auth } from "@/auth";
import AuthModalGate from "@/components/Auth/AuthModalGate";
import MapModal from "@/components/LocationPicker/MapModal";
import TelegramAuthSync from "@/components/TelegramAuthSync";
import PinLock from "@/components/Auth/PinLock";
import OfflineOverlayLazy from "@/components/OfflineOverlayLazy";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

import { ClientProviders } from "@/providers/ClientProviders";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { routing } from "@/navigation";
import { getCachedRootCategories } from '@/lib/data';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Meta' });

  return {
    // Lets every page below use relative paths for canonical, hreflang and OG
    // image URLs; without it a relative URL in those fields is a build error.
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('title'),
      // Applies to child segments only, so the home page (same segment as this
      // layout) sets its own full title.
      template: `%s | ${SITE_NAME}`,
    },
    description: t('description'),
    applicationName: SITE_NAME,
    manifest: '/manifest.json',
    // The tab icon comes from src/app/favicon.ico (Next.js file convention).
    // Declaring another `icon` here would emit a second, competing <link rel="icon">.
    icons: {
      icon: [
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Hadaf Market',
    },
    formatDetection: {
      // Stops iOS Safari turning prices and order numbers into phone links.
      telephone: false,
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [messages, session, rootCategories, storeSettings] = await Promise.all([
    getMessages(),
    auth(),
    getCachedRootCategories(),
    prisma.storeSettings.findUnique({ where: { id: 'default' } }),
  ]);
  const tMeta = await getTranslations({ locale, namespace: 'Meta' });

  const footerSettings = storeSettings
    ? {
        phone: storeSettings.phone || '',
        email: storeSettings.email || '',
        address: storeSettings.address || '',
        socialLinks: storeSettings.socialLinks || '',
      }
    : undefined;

  if (!['uz', 'ru', 'en'].includes(locale)) {
    notFound();
  }

  // Katalog tugmasi to'g'ridan-to'g'ri birinchi root kategoriya sahifasiga o'tadi.
  const firstRootSlug = (rootCategories && rootCategories[0]?.slug) || null;

  const jsonLdOrganization: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: tMeta('home.description'),
    logo: `${SITE_URL}/logo.png`,
  };

  if (storeSettings?.phone) {
    jsonLdOrganization.telephone = storeSettings.phone;
  }
  if (storeSettings?.email) {
    jsonLdOrganization.email = storeSettings.email;
  }
  if (storeSettings?.address) {
    jsonLdOrganization.address = {
      '@type': 'PostalAddress',
      streetAddress: storeSettings.address,
      addressRegion: 'Surxondaryo',
      addressCountry: 'UZ',
    };
  }

  // DB'dagi haqiqiy social linklar — faqat brand nomiga mos keladiganlar qo'shiladi.
  // Telegram link (Qalam_Books_rasmiy) bu HADAF emas, Qalam Books brendi — tashlab ketilgan.
  // supportTelegram (Muhiddinovich_9) shaxsiy username — qo'shilmaydi.
  if (storeSettings?.socialLinks) {
    try {
      const social = JSON.parse(storeSettings.socialLinks);
      const sameAs: string[] = [];
      if (social.instagram && social.instagram.includes('hadaf.market.uz')) {
        sameAs.push(social.instagram);
      }
      if (social.youtube && social.youtube.includes('hadaf_market_uz')) {
        sameAs.push(social.youtube);
      }
      if (sameAs.length > 0) {
        jsonLdOrganization.sameAs = sameAs;
      }
    } catch {
      // socialLinks JSON parse error — safe to ignore
    }
  }

  const jsonLdWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: [routing.locales[0], ...routing.locales.slice(1)],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/${routing.defaultLocale}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
      />
    <ClientProviders messages={messages} locale={locale} session={session}>
          <SessionSync />
          <TelegramAuthSync />
          <Header firstRootSlug={firstRootSlug} />
          <main className="min-h-screen flex flex-col">
            {children}
          </main>
          <Footer initialSettings={footerSettings} />
          <BottomNav firstRootSlug={firstRootSlug} />
          <Toaster />
          <SupportChat />
          <AuthModalGate />
          <PinLock />
          <MapModal />
          <OfflineOverlayLazy />
          <Analytics />
          <SpeedInsights />
        </ClientProviders>
    </>
  );
}

