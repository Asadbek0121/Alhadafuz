// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../globals.css";
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from "next/navigation";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import BottomNav from "@/components/BottomNav/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import SupportChat from "@/components/SupportChat/SupportChat";
import SessionSync from "@/components/SessionSync";
import { auth } from "@/auth";
import AuthModal from "@/components/Auth/AuthModal";
import MapModal from "@/components/LocationPicker/MapModal";
import Script from "next/script";
import TelegramAuthSync from "@/components/TelegramAuthSync";
import PinLock from "@/components/Auth/PinLock";
import OfflineOverlay from "@/components/OfflineOverlay";
import SplashScreen from "@/components/Effects/SplashScreen";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

import { ClientProviders } from "@/providers/ClientProviders";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Meta' });

  return {
    title: t('title'),
    description: t('description'),
    manifest: '/manifest.json',
    icons: {
      icon: '/logo.png',
      apple: '/logo.png',
      shortcut: '/logo.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Hadaf Market',
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

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ClientProviders messages={messages} locale={locale} session={session}>
          <Script src="https://cdn.lordicon.com/lordicon.js" strategy="beforeInteractive" />
          <Script src="https://cdn.lordicon.com/bhenfmcm.js" strategy="beforeInteractive" />
          <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
          <SessionSync />
          <TelegramAuthSync />
          <SplashScreen />
          <Header />
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
          <Footer />
          <BottomNav />
          <Toaster />
          <SupportChat />
          <AuthModal />
          <PinLock />
          <MapModal />
          <OfflineOverlay />
          <Analytics />
          <SpeedInsights />
        </ClientProviders>
      </body>
    </html>
  );
}

