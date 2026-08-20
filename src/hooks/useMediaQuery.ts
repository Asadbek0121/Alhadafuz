"use client";

import { useSyncExternalStore, useCallback } from 'react';

/**
 * Media query hook — komponent ichida breakpoint'ga qarab render qilish uchun.
 * Masalan: `const isMobile = useMediaQuery('(max-width: 992px)')`
 *
 * `useSyncExternalStore` ishlatiladi — hydration mismatch bo'lmaydi:
 * - SSR va hydration paytida `getServerSnapshot` (false) ishlatiladi
 * - hydration'dan keyin haqiqiy `getSnapshot` qiymatiga o'tadi
 * Bu serverda desktop tree, hydration'da desktop (mos), keyin mobilga o'tadi.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback((onStoreChange: () => void) => {
        const mql = window.matchMedia(query);
        mql.addEventListener('change', onStoreChange);
        return () => mql.removeEventListener('change', onStoreChange);
    }, [query]);

    const getSnapshot = useCallback(() => {
        return window.matchMedia(query).matches;
    }, [query]);

    const getServerSnapshot = useCallback(() => false, []);

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
