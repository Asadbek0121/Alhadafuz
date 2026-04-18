"use client";

import { ReactNode } from "react";
import { NextIntlClientProvider } from 'next-intl';
import { WishlistProvider } from '@/context/WishlistContext';
import Providers from "@/providers/QueryProvider";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

interface ClientProvidersProps {
  children: ReactNode;
  messages: any;
  locale: string;
  session: any;
}

export function ClientProviders({ 
  children, 
  messages, 
  locale, 
  session 
}: ClientProvidersProps) {
  return (
    <NextIntlClientProvider 
      messages={messages} 
      locale={locale} 
      timeZone="Asia/Tashkent"
    >
      <Providers>
        <WishlistProvider>
          <SessionProviderWrapper session={session}>
            {children}
          </SessionProviderWrapper>
        </WishlistProvider>
      </Providers>
    </NextIntlClientProvider>
  );
}
