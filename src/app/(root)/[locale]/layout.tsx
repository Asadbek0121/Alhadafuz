import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from "next/navigation";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import BottomNav from "@/components/BottomNav/BottomNav";
import { Toaster } from "@/components/ui/sonner";

import { WishlistProvider } from "@/context/WishlistContext";
import Providers from "@/providers/QueryProvider";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import SupportChat from "@/components/SupportChat/SupportChat";
import SessionSync from "@/components/SessionSync";
import { auth } from "@/auth";
import AuthModal from "@/components/Auth/AuthModal";

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
  const messages = await getMessages();
  const session = await auth();

  if (!['uz', 'ru', 'en'].includes(locale)) {
    notFound();
  }

  if (!messages) {
    console.error("NextIntl Messages are missing for locale:", locale);
  }

  return (
    <html lang={locale} suppressHydrationWarning={true}>
      <body className={inter.className} suppressHydrationWarning={true}>
        <NextIntlClientProvider messages={messages} locale={locale} timeZone="Asia/Tashkent">
          <Providers>
            <WishlistProvider>

              <SessionProviderWrapper session={session}>
                <SessionSync />
                <Header />
                <main className="min-h-screen">
                  {children}
                </main>
                <Footer />
                <BottomNav />
                <Toaster />
                <SupportChat />
                <AuthModal />
              </SessionProviderWrapper>

            </WishlistProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
