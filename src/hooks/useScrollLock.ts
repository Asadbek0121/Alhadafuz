"use client";

import { useEffect } from "react";

/**
 * Scroll-lock hook for modals/drawers/overlays.
 *
 * While `locked` is true the background page cannot be scrolled:
 * - `overflow: hidden` on <body> (desktop)
 * - iOS Safari ignores `overflow: hidden`, so we additionally fix the body
 *   with `position: fixed` + `top: -scrollY` and restore the scroll position
 *   on unlock (the standard body-scroll-lock technique).
 * - A `padding-right` compensation prevents layout jump when the scrollbar
 *   disappears.
 *
 * Reference-counted: if several overlays are open at the same time, the lock
 * is only released when the LAST one closes.
 */

// Module-level state shared by every useScrollLock() instance
let lockCount = 0;
let savedStyles: Record<string, string> | null = null;
let savedScrollY = 0;

function applyLock() {
    if (lockCount > 0) return; // already locked by another panel
    savedStyles = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
    };
    savedScrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    // Scrollbar yo'qolishi tufayli layout sakrashini kompensatsiya qilish
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    // iOS Safari: overflow:hidden yetarli emas — body'ni fixed qilib scroll pozitsiyani saqlaymiz
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = "100%";
}

function releaseLock() {
    if (lockCount > 0 || !savedStyles) return; // other panels still locked
    document.body.style.overflow = savedStyles.overflow;
    document.body.style.paddingRight = savedStyles.paddingRight;
    document.body.style.position = savedStyles.position;
    document.body.style.top = savedStyles.top;
    document.body.style.width = savedStyles.width;
    window.scrollTo(0, savedScrollY);
    savedStyles = null;
}

export function useScrollLock(locked: boolean) {
    useEffect(() => {
        if (!locked) return;
        applyLock(); // no-op if another panel already holds the lock
        lockCount += 1; // register this consumer
        return () => {
            lockCount = Math.max(0, lockCount - 1);
            releaseLock();
        };
    }, [locked]);
}
