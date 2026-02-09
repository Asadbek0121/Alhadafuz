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
        messages: (await import(`../../messages/${locale}.json`)).default,
        onError(error) {
            // Suppress missing message errors in production
            if (process.env.NODE_ENV === 'production') {
                console.warn(error.message);
            }
        },
        getMessageFallback({ namespace, key }) {
            // Return the key itself as fallback
            return key;
        }
    };
});
