"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLocale } from "next-intl";

export default function NotFound() {
    const locale = useLocale();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 font-sans text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Sahifa topilmadi</h1>
            <p className="text-gray-600 mb-8 max-w-md">
                Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan.
            </p>
            <Link href={`/${locale}`}>
                <Button>Bosh sahifaga qaytish</Button>
            </Link>
        </div>
    );
}
