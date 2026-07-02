'use client'

import { Globe } from 'lucide-react'
import { useAutoTranslate } from './AutoTranslateProvider'

/**
 * Floating, site-wide auto-translation switch. Shown only to readers whose
 * locale can be translated (Chinese readers see nothing). Filled when on,
 * muted outline when off.
 */
export function AutoTranslateToggle() {
  const { enabled, toggle, canTranslate } = useAutoTranslate()

  if (!canTranslate) return null

  return (
    <button
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Auto-translate is on' : 'Auto-translate is off'}
      title={enabled ? 'Auto-translate: On' : 'Auto-translate: Off'}
      className={`fixed bottom-9 left-9 z-20 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-colors ${
        enabled
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border border-gray-200 bg-white text-gray-400 hover:text-gray-600'
      }`}
    >
      <Globe className='h-5 w-5' />
    </button>
  )
}
