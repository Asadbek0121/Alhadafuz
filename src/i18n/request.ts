import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically corresponds to the `[locale]` segment
    let locale = await requestLocale;

    // Ensure that a valid locale is used
    if (!locale || !['uz', 'ru', 'en'].includes(locale)) {
        locale = 'uz';
    }

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});
