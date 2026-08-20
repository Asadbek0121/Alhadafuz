"use client";

import { useState, useEffect } from 'react';

/**
 * Media query hook — komponent ichida breakpoint'ga qarab render qilish uchun.
 * Masalan: `const isMobile = useMediaQuery('(max-width: 992px)')`
 *
 * Lazy initializer: useEffect'da setState chaqirmaslik uchun state'ni
 * to'g'ridan-to'g'ri window.matchMedia bilan boshlaymiz.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(
        typeof window !== 'undefined' ? window.matchMedia(query).matches : false
    );

    useEffect(() => {
        const mql = window.matchMedia(query);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [query]);

    return matches;
}