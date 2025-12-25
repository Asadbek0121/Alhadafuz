import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from "next/font/google";
import { auth } from '@/auth';
import "../../globals.css";
import SessionProviderWrapper from '@/components/SessionProviderWrapper';

import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const inter = Inter({ subsets: ["latin"] });

export default async function AdminLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params?: Promise<{ locale?: string }>;
}) {
    const session = await auth();

    // Dev Mode Fallback
    const user = session?.user || { email: 'dev@admin.com', name: 'Dev Admin' };

    const { locale = 'uz' } = (await params) || {};

    let messages;
    try {
        messages = await getMessages({ locale });
    } catch (error) {
        messages = {};
    }

    return (
        <html lang={locale}>
            <body className={inter.className} style={{ display: 'flex', minHeight: '100vh', background: '#F2F6FA' }} suppressHydrationWarning={true}>
                <SessionProviderWrapper session={session}>
                    <NextIntlClientProvider messages={messages}>
                        <AdminSidebar />
                        <AdminHeader />

                        {/* Main Content */}
                        <main style={{ marginLeft: '270px', marginTop: '70px', flex: 1, padding: '30px', width: 'calc(100% - 270px)' }}>
                            {children}
                        </main>
                    </NextIntlClientProvider>
                </SessionProviderWrapper>
            </body>
        </html>
    );
}
