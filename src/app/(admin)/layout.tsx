// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { auth } from '@/auth';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';
import QueryProvider from '@/components/QueryProvider';
import { Toaster } from "@/components/ui/sonner";
import { Metadata } from 'next';

import AdminSidebar from './admin/AdminSidebar';
import AdminHeader from './admin/AdminHeader';
import Admin2FAPage from './Admin2FAPage';

export const metadata: Metadata = {
    title: {
        default: 'Hadaf Admin Panel',
        // Each admin route sets a bare title; the suffix keeps admin tabs
        // distinguishable from storefront tabs.
        template: '%s | Hadaf Admin',
    },
    description: 'Control center for Hadaf Marketplace',
    // The whole panel is behind a login — keep it out of search results.
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
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
            <div className="flex items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold">Unauthorized</h1>
            </div>
        );
    }

    const resolvedParams = await params;
    const locale = resolvedParams?.locale || 'uz';

    const is2faPassed = (session?.user as any)?.admin2fa;
    if (userRole === 'ADMIN' && !is2faPassed) {
        return (
            <>
                <SessionProviderWrapper session={session}>
                    <Toaster />
                    <Admin2FAPage userId={(session.user as any).id} />
                </SessionProviderWrapper>
            </>
        );
    }

    let messages;
    try {
        messages = await getMessages({ locale });
    } catch (error) {
        messages = {};
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#F2F6FA' }}>
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
        </div>
    );
}
