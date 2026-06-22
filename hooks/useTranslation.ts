'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { shouldTranslate } from '@/lib/translate.shared'

interface UseTranslationResult {
  /** Translated text, or original text if translation is not needed / pending. */
  translatedText: string
  /** True while a translation request is in flight. */
  isTranslating: boolean
  /** Error message if translation failed, or null. */
  error: string | null
  /** Manually retry translation. */
  retry: () => void
  /** Toggle between translated and original text. */
  toggleOriginal: () => void
  /** Whether the original text is being shown. */
  showOriginal: boolean
  /** True if a translation was actually applied (text differs from original). */
  actuallyTranslated: boolean
}

function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

/** Read a cached translation. Returns null if absent or sessionStorage is unavailable (e.g. SSR). */
function readSessionCache(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

/** Persist a translation. Silently no-ops if sessionStorage is unavailable or over quota. */
function writeSessionCache(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* unavailable or quota exceeded */
  }
}

/**
 * Hook that auto-translates text content into the user's browser language.
 *
 * - For Chinese (zh*) locales, returns the original text (no-op).
 * - For non-Chinese locales, calls /api/translate and caches in sessionStorage.
 * - Translations are cached per (contentHash, locale) pair.
 *
 * @param text        The original text to translate.
 * @param isMarkdown  Whether to preserve markdown syntax during translation.
 * @param contentId   Optional unique ID for more reliable cache key.
 */
export function useTranslation(
  text: string,
  isMarkdown = true,
  contentId?: string,
): UseTranslationResult {
  const locale = useLocale()
  const [translatedText, setTranslatedText] = useState<string>(text)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const mountedRef = useRef(true)

  const needsTranslation = shouldTranslate(locale)
  const cacheKey = `translate:${contentId ?? hashText(text)}:${locale}`

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const translate = useCallback(async () => {
    setIsTranslating(true)
    setError(null)
    setShowOriginal(false)

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLocale: locale, isMarkdown }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error ?? `Translation failed (${response.status})`)
      }

      const { translatedText } = await response.json()
      if (!mountedRef.current) return

      setTranslatedText(translatedText)
      writeSessionCache(cacheKey, translatedText)
    } catch (err) {
      if (!mountedRef.current) return
      console.error('[useTranslation] Error:', err)
      setError(err instanceof Error ? err.message : 'Translation error')
      setTranslatedText(text) // fall back to original
    } finally {
      if (mountedRef.current) setIsTranslating(false)
    }
  }, [text, locale, isMarkdown, cacheKey])

  // Resolve the displayed text whenever the inputs change: show the original
  // for Chinese/empty content, serve a cached translation when present, or
  // kick off a fresh translation while showing the original in the meantime.
  useEffect(() => {
    if (!needsTranslation || !text.trim()) {
      setTranslatedText(text)
      setError(null)
      setIsTranslating(false)
      setShowOriginal(false)
      return
    }

    const cached = readSessionCache(cacheKey)
    if (cached !== null) {
      setTranslatedText(cached)
      setError(null)
      setIsTranslating(false)
      return
    }

    setTranslatedText(text) // show original while the request is in flight
    translate()
  }, [text, locale, needsTranslation, cacheKey, translate])

  const displayedText = showOriginal ? text : translatedText
  const actuallyTranslated = needsTranslation && translatedText !== text

  return {
    translatedText: displayedText,
    isTranslating,
    error,
    retry: translate,
    toggleOriginal: () => setShowOriginal((prev) => !prev),
    showOriginal,
    actuallyTranslated,
  }
}
