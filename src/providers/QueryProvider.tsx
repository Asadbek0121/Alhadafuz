"use client";

// Force rebuild
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";


import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';

export default function Providers({
    children,
    locale,
    messages
}: {
    children: ReactNode;
    locale: string;
    messages: AbstractIntlMessages;
}) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));

    return (
        <NextIntlClientProvider messages={messages} locale={locale} timeZone="Asia/Tashkent">
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </NextIntlClientProvider>
    );
}
