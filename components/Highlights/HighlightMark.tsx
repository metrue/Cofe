'use client'

import { useEffect, useState } from 'react'

import { anchorToRange } from '@/lib/highlights/anchoring'
import { Highlight } from '@/lib/highlights/schema'
import { setFocused, useFocusedHighlight } from '@/lib/highlights/syncFocus'

interface HighlightMarkProps {
  highlight: Highlight
  articleEl: HTMLElement | null
  /** Trigger to recompute rects (article resize, font load, etc.). */
  recomputeKey?: number
}

interface OverlayRect {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Renders the visual highlight by overlaying absolutely-positioned divs over
 * each `Range.getClientRects()` of the resolved anchor. Doesn't modify the
 * article DOM — non-invasive overlay.
 */
export function HighlightMark({ highlight, articleEl, recomputeKey = 0 }: HighlightMarkProps) {
  const [rects, setRects] = useState<OverlayRect[]>([])
  const focused = useFocusedHighlight()

  useEffect(() => {
    if (!articleEl) return
    const range = anchorToRange(highlight.anchor, articleEl)
    if (!range) {
      setRects([])
      return
    }
    const articleRect = articleEl.getBoundingClientRect()
    const next = Array.from(range.getClientRects()).map((r) => ({
      top: r.top - articleRect.top + articleEl.scrollTop,
      left: r.left - articleRect.left,
      width: r.width,
      height: r.height,
    }))
    setRects(next)
  }, [highlight.anchor, articleEl, recomputeKey])

  if (rects.length === 0) return null
  const isFocused = focused === highlight.id
  const isResolved = highlight.resolved

  return (
    <>
      {rects.map((r, i) => (
        <button
          key={`${highlight.id}-${i}`}
          type='button'
          aria-label={`Highlight: ${highlight.thread[0]?.body.slice(0, 80) ?? ''}`}
          data-highlight-id={highlight.id}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setFocused(isFocused ? null : highlight.id)
          }}
          onMouseEnter={() => setFocused(highlight.id)}
          style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
          className={[
            'absolute z-10 cursor-pointer rounded-sm border-b-2 transition-colors',
            isResolved
              ? 'bg-gray-200/30 border-gray-300/60 hover:bg-gray-200/50'
              : 'bg-amber-200/40 border-amber-300/70 hover:bg-amber-200/70',
            isFocused && !isResolved ? 'bg-amber-300/60 border-amber-500' : '',
            isFocused && isResolved ? 'bg-gray-300/60 border-gray-500' : '',
          ].join(' ')}
        />
      ))}
    </>
  )
}
