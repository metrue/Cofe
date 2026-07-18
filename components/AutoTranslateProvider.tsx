'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { shouldTranslate } from '@/lib/translate.shared'

const STORAGE_KEY = 'auto-translate-enabled'

interface AutoTranslateValue {
  /** Whether auto-translation is currently turned on. */
  enabled: boolean
  /** Flip the current on/off state (persisted across sessions). */
  toggle: () => void
  /** Whether translation is even relevant for this reader (false for Chinese locales). */
  canTranslate: boolean
}

const AutoTranslateContext = createContext<AutoTranslateValue | null>(null)

/**
 * Site-wide auto-translation preference. A single switch (see AutoTranslateToggle)
 * controls whether non-Chinese readers see translated content across every page.
 * Defaults to on, and the choice is remembered in localStorage.
 */
export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const canTranslate = shouldTranslate(locale)
  const [enabled, setEnabledState] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setEnabledState(stored === 'true')
    } catch {
      /* localStorage unavailable */
    }
  }, [])

  // Stable across the provider's lifetime: reads the previous value from the
  // updater so it never needs `enabled` in its dependency list.
  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        /* localStorage unavailable */
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ enabled, toggle, canTranslate }),
    [enabled, toggle, canTranslate],
  )

  return (
    <AutoTranslateContext.Provider value={value}>
      {children}
    </AutoTranslateContext.Provider>
  )
}

export function useAutoTranslate(): AutoTranslateValue {
  const ctx = useContext(AutoTranslateContext)
  if (!ctx) {
    throw new Error('useAutoTranslate must be used within an AutoTranslateProvider')
  }
  return ctx
}
