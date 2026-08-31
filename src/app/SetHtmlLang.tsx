'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * `<html lang>` atributini client-side o'rnatadi. Root layout statik bo'lishi
 * uchun `headers()` ishlatilmaydi (aks holda butun app dynamic bo'lib ISR/edge
 * cache o'chadi). Locale URL'dan o'qiladi (next-intl request config talab
 * qilmaydi — admin/print kabi locale'siz route'lar ham ishlaydi).
 * suppressHydrationWarning + useEffect — hydration mismatch yaratmaydi.
 */
export default function SetHtmlLang() {
    const pathname = usePathname();

    useEffect(() => {
        const m = pathname?.match(/^\/(uz|ru|en)(\/|$)/);
        document.documentElement.lang = m ? m[1] : 'uz';
    }, [pathname]);

    return null;
}
