import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

export default getRequestConfig(async () => {
  // Get browser's Accept-Language header
  const acceptLanguage = headers().get('Accept-Language');
  let browserLocale = acceptLanguage ? acceptLanguage.split(',')[0] : 'en';

  // Special handling for Chinese locales
  if (browserLocale.startsWith('zh')) {
    if (browserLocale === 'zh-TW' || browserLocale === 'zh-HK') {
      browserLocale = browserLocale;  // Keep zh-TW or zh-HK as is
    } else {
      browserLocale = 'zh';  // Default to zh for other Chinese variants
    }
  } else {
    browserLocale = browserLocale.split('-')[0];
  }

  // Use browser locale if supported, otherwise fallback to 'en'
  const supportedLocales = ['en', 'zh', 'zh-TW', 'zh-HK', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru', 'ar', 'hi', 'it', 'nl', 'tr', 'pl', 'vi', 'th', 'id'];
  const selectedLocale = supportedLocales.includes(browserLocale) ? browserLocale : 'en';

  return {
    locale: selectedLocale,
    messages: (await import(`./messages/${selectedLocale}.json`)).default
  };
});
