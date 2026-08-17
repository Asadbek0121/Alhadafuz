import "./globals.css";
import { Inter } from "next/font/google";
import { headers } from "next/headers";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

// Root layout: the single <html>/<body> shell for the whole app.
// The locale is resolved by the next-intl middleware (X-NEXT-INTL-LOCALE header);
// /admin and /print routes are not localized, so they fall back to 'uz'.
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
                {children}
            </body>
        </html>
    );
}
