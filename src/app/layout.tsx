import "./globals.css";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

// Root layout: the single <html>/<body> shell for the whole app.
// The locale is resolved by the next-intl middleware (X-NEXT-INTL-LOCALE header);
// /admin and /print routes are not localized, so they fall back to 'uz'.
// Telegram WebApp script ROOT layout'da — `beforeInteractive` faqat root layout'da
// ishlaydi. Nested layout'da client-render'da "script tag" xatosi berardi.
export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const h = await headers();
    const locale = h.get("x-next-intl-locale") || "uz";

    return (
        <html lang={locale} suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
                {children}
            </body>
        </html>
    );
}
