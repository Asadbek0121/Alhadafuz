"use client";

/**
 * Creates a semi-unique fingerprint for the browser.
 * In a real-world scenario, you might use a library like FingerprintJS.
 */
export function getBrowserFingerprint() {
    if (typeof window === 'undefined') return 'server';

    const { screen, navigator } = window;
    const components = [
        navigator.userAgent,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.language,
        navigator.hardwareConcurrency || 'unknown',
    ];

    // Create a simple hash-like string
    return btoa(components.join('|')).substring(0, 32);
}
