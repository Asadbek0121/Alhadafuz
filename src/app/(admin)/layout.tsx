import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from "next/font/google";
import { auth } from '@/auth';
import "../globals.css";
import SessionProviderWrapper from '@/components/SessionProviderWrapper';
import QueryProvider from '@/components/QueryProvider';
import { Toaster } from "@/components/ui/sonner";
import { Metadata } from 'next';

import AdminSidebar from './admin/AdminSidebar';
import AdminHeader from './admin/AdminHeader';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: 'Hadaf Admin Panel',
    description: 'Control center for Hadaf Marketplace',
};

export default async function AdminLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params?: Promise<{ locale?: string }>;
}) {
    const session = await auth();

    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== 'ADMIN' && userRole !== 'VENDOR')) {
        // This is a safety check. Unauthorized users should be caught by middleware.
        // But if they reach here, we show nothing or redirect.
        return (
            <html lang="uz" suppressHydrationWarning={true}>
                <body suppressHydrationWarning={true}>
                    <div className="flex items-center justify-center min-h-screen">
                        <h1 className="text-2xl font-bold">Unauthorized</h1>
                    </div>
                </body>
            </html>
        );
    }

    const { locale = 'uz' } = (await params) || {};

    let messages;
    try {
        messages = await getMessages({ locale });
    } catch (error) {
        messages = {};
    }

    return (
        <html lang={locale} suppressHydrationWarning={true}>
            <body className={inter.className} style={{ display: 'flex', minHeight: '100vh', background: '#F2F6FA' }} suppressHydrationWarning={true}>
                <SessionProviderWrapper session={session}>
                    <QueryProvider>
                        <NextIntlClientProvider messages={messages} locale={locale}>
                            <AdminSidebar />
                            <AdminHeader />

                            {/* Main Content */}
                            <main style={{ marginLeft: '270px', marginTop: '70px', flex: 1, padding: '30px', width: 'calc(100% - 270px)' }}>
                                {children}
                            </main>
                            <Toaster />
                        </NextIntlClientProvider>
                    </QueryProvider>
                </SessionProviderWrapper>
            </body>
        </html>
    );
}
