import {
  normalizeLocale,
  shouldTranslate,
  localeToLabel,
  getTranslatableLocales,
} from '../../lib/translate.shared'

describe('translate.shared', () => {
  describe('normalizeLocale', () => {
    it('maps zh to zh-CN', () => {
      expect(normalizeLocale('zh')).toBe('zh-CN')
    })

    it('collapses zh-HK and zh-TW to zh-TW', () => {
      expect(normalizeLocale('zh-HK')).toBe('zh-TW')
      expect(normalizeLocale('zh-TW')).toBe('zh-TW')
    })

    it('strips the region from non-Chinese locales', () => {
      expect(normalizeLocale('en-US')).toBe('en')
      expect(normalizeLocale('de-DE')).toBe('de')
      expect(normalizeLocale('fr')).toBe('fr')
    })
  })

  describe('shouldTranslate', () => {
    it('returns false for every Chinese variant', () => {
      for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh-HK', 'zh-Hans', 'zh-Hans-CN']) {
        expect(shouldTranslate(locale)).toBe(false)
      }
    })

    it('returns true for non-Chinese locales', () => {
      for (const locale of ['en', 'en-US', 'ja', 'ko', 'fr', 'de-DE']) {
        expect(shouldTranslate(locale)).toBe(true)
      }
    })
  })

  describe('localeToLabel', () => {
    it('returns the native label for known locales', () => {
      expect(localeToLabel('en')).toBe('English')
      expect(localeToLabel('ja')).toBe('日本語')
      expect(localeToLabel('zh-TW')).toBe('繁體中文')
    })

    it('falls back to the raw code for unknown locales', () => {
      expect(localeToLabel('xx')).toBe('xx')
    })
  })

  describe('getTranslatableLocales', () => {
    it('lists only locales that should be translated', () => {
      const locales = getTranslatableLocales()
      expect(locales).toContain('en')
      expect(locales).not.toContain('zh')
      expect(locales.every((locale) => shouldTranslate(locale))).toBe(true)
    })
  })
})
