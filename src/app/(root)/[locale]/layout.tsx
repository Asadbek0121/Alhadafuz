import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from "next/navigation";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import BottomNav from "@/components/BottomNav/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import Providers from "@/providers/QueryProvider";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import SupportChat from "@/components/SupportChat/SupportChat";
import { auth } from "@/auth";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "UzMarket - Online Bozor",
  description: "O'zbekistondagi eng katta online bozor",
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!['uz', 'ru', 'en'].includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const session = await auth();

  if (!messages) {
    console.error("NextIntl Messages are missing for locale:", locale);
  }

  return (
    <html lang={locale}>
      <body className={inter.className} suppressHydrationWarning={true}>
        <NextIntlClientProvider messages={messages} locale={locale} timeZone="Asia/Tashkent">
          <Providers>
            <WishlistProvider>
              <CartProvider>
                <SessionProviderWrapper session={session}>
                  <Header />
                  <main className="min-h-screen">
                    {children}
                  </main>
                  <Footer />
                  <BottomNav />
                  <Toaster />
                  <SupportChat />
                </SessionProviderWrapper>
              </CartProvider>
            </WishlistProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
