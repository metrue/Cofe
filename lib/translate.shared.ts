/**
 * Client-safe translation helpers (no Node.js dependencies).
 * This module can be imported by both server and client code.
 */

/**
 * Canonicalise a locale code for use as a stable cache key and for Chinese
 * detection: collapse regional Chinese variants (zh-HK → zh-TW) and strip the
 * region from everything else (en-US → en).
 */
export function normalizeLocale(locale: string): string {
  if (locale === 'zh') return 'zh-CN'
  if (locale === 'zh-HK' || locale === 'zh-TW') return 'zh-TW'
  return locale.split('-')[0]
}

/** Locales that should NOT trigger translation (reader likely understands Chinese). */
const CHINESE_LOCALES = new Set(['zh', 'zh-CN', 'zh-TW', 'zh-HK'])

/**
 * Whether translation is needed for a given user locale.
 * Returns false for Chinese locales since the blog content is primarily in Chinese.
 */
export function shouldTranslate(targetLocale: string): boolean {
  return !CHINESE_LOCALES.has(normalizeLocale(targetLocale))
}

/**
 * Normalised locale → human-readable label.
 */
export function localeToLabel(locale: string): string {
  const labels: Record<string, string> = {
    en: 'English',
    ja: '日本語',
    ko: '한국어',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
    pt: 'Português',
    ru: 'Русский',
    ar: 'العربية',
    hi: 'हिन्दी',
    it: 'Italiano',
    nl: 'Nederlands',
    tr: 'Türkçe',
    pl: 'Polski',
    vi: 'Tiếng Việt',
    th: 'ไทย',
    id: 'Bahasa Indonesia',
    zh: '中文',
    'zh-TW': '繁體中文',
    'zh-HK': '繁體中文',
  }
  return labels[locale] ?? locale
}

/**
 * List the locales we can translate into (all non-Chinese supported locales).
 */
export function getTranslatableLocales(): string[] {
  return [
    'en', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru', 'ar',
    'hi', 'it', 'nl', 'tr', 'pl', 'vi', 'th', 'id',
  ]
}
