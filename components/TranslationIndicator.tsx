'use client'

import { localeToLabel } from '@/lib/translate.shared'

interface TranslationIndicatorProps {
  /** The user's locale (used to label the target language). */
  locale: string
  /** True while a translation request is in flight. */
  isTranslating: boolean
  /** True once a translation actually differs from the original. */
  actuallyTranslated: boolean
  /** Whether the original (untranslated) text is currently shown. */
  showOriginal: boolean
  /** Toggle between the translated and original text. */
  onToggleOriginal: () => void
  /** 'full' for article pages (verbose), 'compact' for cards. */
  variant?: 'full' | 'compact'
}

/**
 * Auto-translation status row: a "show original / show translation" toggle,
 * an "auto-translated" badge, and an in-flight spinner. Renders nothing when
 * there is neither an in-flight request nor an applied translation.
 */
export function TranslationIndicator({
  locale,
  isTranslating,
  actuallyTranslated,
  showOriginal,
  onToggleOriginal,
  variant = 'full',
}: TranslationIndicatorProps) {
  if (!isTranslating && !actuallyTranslated) return null

  const full = variant === 'full'

  return (
    <div className={full ? 'flex items-center gap-3 mb-4 text-xs' : 'flex items-center gap-2 mt-2 text-xs'}>
      {actuallyTranslated && (
        <button
          onClick={onToggleOriginal}
          className='text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors'
        >
          {showOriginal
            ? `Show ${full ? '' : 'in '}${localeToLabel(locale)}`
            : `Show original${full ? ' (Chinese)' : ''}`}
        </button>
      )}
      {actuallyTranslated && !showOriginal && (
        <span className={`inline-flex items-center gap-1 ${full ? 'text-green-500' : 'text-green-400'}`}>
          <span className='w-1.5 h-1.5 rounded-full bg-green-400' />
          {full ? `Auto-translated to ${localeToLabel(locale)}` : 'Translated'}
        </span>
      )}
      {isTranslating && (
        <span className='text-gray-400 animate-pulse'>translating...</span>
      )}
    </div>
  )
}
