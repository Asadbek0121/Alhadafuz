"use client";

import { useEffect, useRef } from 'react';

/**
 * Modal/drawer uchun focus trap hook.
 *
 * Ochilganda focus element ichiga olib kiradi, Tab focus'ni ichida ushlab
 * turadi, yopilganda oldingi triggerga qaytaradi. Escape yopishni ham qo'llab-
 * quvvatlaydi (`onClose` orqali).
 */
export function useFocusTrap(active: boolean, onClose?: () => void) {
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!active) return;

        // Ochiq paytidagi fokusli elementni saqlab qo'yamiz — yopilganda qaytarish uchun
        triggerRef.current = document.activeElement as HTMLElement | null;

        const container = containerRef.current;
        if (container) {
            const focusable = container.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
                return;
            }
            if (e.key !== 'Tab') return;

            const container = containerRef.current;
            if (!container) return;
            const focusable = Array.from(container.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter(el => el.offsetParent !== null);

            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            // Yopilganda fokus oldingi triggerga qaytadi
            if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
                triggerRef.current.focus();
            }
        };
    }, [active, onClose]);

    return containerRef;
}
