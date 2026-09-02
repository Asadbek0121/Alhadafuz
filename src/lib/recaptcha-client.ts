"use client";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

let scriptLoaded = false;

function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).grecaptcha || scriptLoaded) return resolve();
    scriptLoaded = true;
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

export async function getRecaptchaToken(action = 'submit'): Promise<string | null> {
  if (!SITE_KEY || typeof window === 'undefined') return null;
  try {
    await loadRecaptchaScript();
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha) return null;
    await new Promise<void>((resolve) => {
      if (grecaptcha.ready) grecaptcha.ready(resolve);
      else resolve();
    });
    const token = await grecaptcha.execute(SITE_KEY, { action });
    return token || null;
  } catch (e) {
    return null;
  }
}
