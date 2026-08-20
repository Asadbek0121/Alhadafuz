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
import Script from "next/script";
import TelegramAuthSync from "@/components/TelegramAuthSync";
import PinLock from "@/components/Auth/PinLock";
import OfflineOverlayLazy from "@/components/OfflineOverlayLazy";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

import { ClientProviders } from "@/providers/ClientProviders";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { routing } from "@/navigation";

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
  const [messages, session] = await Promise.all([getMessages(), auth()]);

  if (!['uz', 'ru', 'en'].includes(locale)) {
    notFound();
  }

  const jsonLdOrganization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    // sameAs ataylab qo'shilmagan — haqiqiy ijtimoiy tarmoq profillari
    // mavjud bo'lmaguncha generic/fake linklar ko'rsatilmaydi.
  };

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
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
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
          <Header />
          <main className="min-h-screen flex flex-col">
            {children}
          </main>
          <Footer />
          <BottomNav />
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

