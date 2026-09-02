/**
 * Tarjima yordamchilari va avtomatik tarjima servisi.
 */

const MYMEMORY_API = "https://api.mymemory.translated.net/get";

export async function translateText(text: string, from: string, to: string): Promise<string> {
  if (!text) return text;
  try {
    const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data?.responseData?.translatedText || text;
  } catch (e) {
    console.error("[translate] MyMemory error:", e);
    return text;
  }
}

export async function translateCategoryName(uzName: string): Promise<Record<string, string>> {
  const [ru, en] = await Promise.all([
    translateText(uzName, "uz", "ru"),
    translateText(uzName, "uz", "en"),
  ]);
  return { uz: uzName, ru, en };
}

export function getLocalizedText(
  translations: string | null | undefined,
  locale: string,
  fallback?: string | null
): string {
  if (translations) {
    try {
      const t = JSON.parse(translations);
      if (t[locale]) return t[locale];
    } catch (e) { /* ignore */ }
  }
  return fallback || '';
}

export function getCategoryName(cat: { translations?: string | null; name?: string | null }, locale: string): string {
  return getLocalizedText(cat.translations || null, locale, cat.name || '');
}
