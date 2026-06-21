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
  const cacheKey = contentId
    ? `translate:${contentId}:${locale}`
    : `translate:${hashText(text)}:${locale}`

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Reset when text or locale changes
  useEffect(() => {
    if (!needsTranslation || !text.trim()) {
      setTranslatedText(text)
      setError(null)
      setIsTranslating(false)
      setShowOriginal(false)
      return
    }

    // Check sessionStorage cache
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        setTranslatedText(cached)
        setError(null)
        setIsTranslating(false)
        return
      }
    } catch { /* sessionStorage unavailable */ }

    // Initiate translation
    setIsTranslating(true)
    setError(null)
    setTranslatedText(text) // show original while loading
  }, [text, locale, needsTranslation, cacheKey])

  const translate = useCallback(async () => {
    if (!needsTranslation || !text.trim()) {
      setTranslatedText(text)
      return
    }

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

      const data = await response.json()
      if (mountedRef.current) {
        setTranslatedText(data.translatedText)
        // Cache in sessionStorage
        try {
          sessionStorage.setItem(cacheKey, data.translatedText)
        } catch { /* quota exceeded */ }
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('[useTranslation] Error:', err)
        setError(err instanceof Error ? err.message : 'Translation error')
        setTranslatedText(text) // fall back to original
      }
    } finally {
      if (mountedRef.current) {
        setIsTranslating(false)
      }
    }
  }, [text, locale, isMarkdown, cacheKey, needsTranslation])

  useEffect(() => {
    // Only trigger the actual API call on mount / text change
    if (needsTranslation && text.trim() && !sessionStorage.getItem(cacheKey)) {
      translate()
    }
  }, [translate, needsTranslation, text, cacheKey])

  const displayedText = showOriginal ? text : translatedText

  return {
    translatedText: displayedText,
    isTranslating,
    error,
    retry: translate,
    toggleOriginal: () => setShowOriginal((prev) => !prev),
    showOriginal,
  }
}
