'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { shouldTranslate } from '@/lib/translate.shared'

interface TranslateContentProps {
  children: string
  /** Treat content as markdown (preserves markdown syntax). Default: true */
  isMarkdown?: boolean
  /** Unique identifier for this content (used in session storage cache key). */
  contentId?: string
  /** Optional class name for the wrapper. */
  className?: string
  /** Render function to customise how the translated text is displayed. */
  render?: (text: string) => React.ReactNode
}

/**
 * Auto-translates its text content into the user's browser language.
 *
 * - For Chinese (zh*) locales, content is shown as-is (no-op).
 * - For non-Chinese locales, content is translated via the /api/translate endpoint.
 * - Translations are cached in sessionStorage to avoid redundant API calls
 *   during a browsing session.
 * - Shows the original text while translation loads.
 */
export function TranslateContent({
  children: text,
  isMarkdown = true,
  contentId,
  className,
  render,
}: TranslateContentProps) {
  const locale = useLocale()
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const mountedRef = useRef(true)

  const needsTranslation = shouldTranslate(locale)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const translate = useCallback(async () => {
    if (!needsTranslation || !text.trim()) {
      setTranslatedText(null)
      return
    }

    // Check sessionStorage cache
    const cacheKey = `translate:${contentId ?? hashText(text)}:${locale}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        setTranslatedText(cached)
        return
      }
    } catch {
      /* sessionStorage may not be available */
    }

    setIsTranslating(true)

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
        console.error('[TranslateContent] Error:', err)
        // Fall back to original text
        setTranslatedText(null)
      }
    } finally {
      if (mountedRef.current) {
        setIsTranslating(false)
      }
    }
  }, [text, locale, isMarkdown, contentId, needsTranslation])

  useEffect(() => {
    translate()
  }, [translate])

  const displayText = translatedText ?? text

  if (render) {
    return <>{render(displayText)}</>
  }

  return (
    <span className={className}>
      {displayText}
      {isTranslating && translatedText === null && text !== displayText && (
        <span className='ml-1 text-xs text-gray-400 animate-pulse'>translating...</span>
      )}
    </span>
  )
}

/**
 * Simple hash function for use as a cache key.
 */
function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}



// Re-export for convenience
export { shouldTranslate }
