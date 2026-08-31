import "./globals.css";
import { Inter } from "next/font/google";
import Script from "next/script";
import SetHtmlLang from "./SetHtmlLang";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

// Root layout: the single <html>/<body> shell for the whole app.
// Telegram WebApp script ROOT layout'da — `beforeInteractive` faqat root layout'da
// ishlaydi. Nested layout'da client-render'da "script tag" xatosi berardi.
//
// Eslatma: `headers()` bu yerda ATALMAYDI — u butun app'ni dynamic qilib,
// ISR/edge cache'ni o'chirardi. `lang` atributi client-side SetHtmlLang
// komponenti orqali o'rnatiladi (suppressHydrationWarning bilan, hydration
// mismatch yaratmaydi).
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="uz" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
                <SetHtmlLang />
                {children}
            </body>
        </html>
    );
}

