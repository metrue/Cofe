'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { shouldTranslate } from '@/lib/translate.shared'

const STORAGE_KEY = 'auto-translate-enabled'

interface AutoTranslateValue {
  /** Whether auto-translation is currently turned on. */
  enabled: boolean
  /** Turn auto-translation on or off (persisted across sessions). */
  setEnabled: (value: boolean) => void
  /** Flip the current on/off state. */
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

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      /* localStorage unavailable */
    }
  }, [])

  const toggle = useCallback(() => setEnabled(!enabled), [enabled, setEnabled])

  return (
    <AutoTranslateContext.Provider value={{ enabled, setEnabled, toggle, canTranslate }}>
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
