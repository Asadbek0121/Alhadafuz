// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Hisob-faktura chop etish",
    description: "Print layout for Hadaf Market Invoice",
    // Printable invoices carry order data — never index them.
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function PrintLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
