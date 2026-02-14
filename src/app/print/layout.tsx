import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Print Invoice",
    description: "Print layout for Hadaf Market Invoice",
};

export default function PrintLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="uz" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>{children}</body>
        </html>
    );
}
