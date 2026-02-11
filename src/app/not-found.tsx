"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

// This Not Found page handles errors at the root level (when no locale is present)
// It MUST define its own html and body tags because there is no root layout.
export default function NotFound() {
    return (
        <html lang="uz" suppressHydrationWarning={true}>
            <body suppressHydrationWarning={true}>
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Sahifa topilmadi</h1>
                    <p className="text-gray-600 mb-8 text-center max-w-md">
                        Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan.
                    </p>
                    <Link href="/uz">
                        <Button>Bosh sahifaga qaytish</Button>
                    </Link>
                </div>
            </body>
        </html>
    );
}
