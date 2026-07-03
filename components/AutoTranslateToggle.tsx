'use client'

import { Globe } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useAutoTranslate } from './AutoTranslateProvider'

/** Short code for the reader's target language, e.g. en-US -> EN. */
function targetLanguageCode(locale: string): string {
  return locale.split('-')[0].toUpperCase()
}

/**
 * Site-wide auto-translation switch: a compact pill pinned to the top-right.
 * Shown only to readers whose locale can be translated (Chinese readers see
 * nothing). Reflects what you're currently reading — the target language when
 * on, 中文 when off — and flips on click.
 */
export function AutoTranslateToggle() {
  const { enabled, toggle, canTranslate } = useAutoTranslate()
  const locale = useLocale()

  if (!canTranslate) return null

  return (
    <button
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Auto-translate is on' : 'Auto-translate is off'}
      title={enabled ? 'Auto-translate: On — click to show the original' : 'Auto-translate: Off — click to translate'}
      className='fixed top-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:border-gray-300'
    >
      <Globe className={`h-3.5 w-3.5 ${enabled ? 'text-green-500' : 'text-gray-400'}`} />
      <span className={enabled ? 'text-gray-700' : 'text-gray-400'}>
        {enabled ? targetLanguageCode(locale) : '中文'}
      </span>
    </button>
  )
}
