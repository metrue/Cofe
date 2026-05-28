'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { anchorToRange } from '@/lib/highlights/anchoring'
import { CardSpec, solveCardLayout } from '@/lib/highlights/cardLayout'
import { Highlight } from '@/lib/highlights/schema'

import { CommentCard } from './CommentCard'

interface CommentRailProps {
  highlights: Highlight[]
  articleEl: HTMLElement | null
  recomputeKey: number
  fingerprint: string | null
  isOwner: boolean
  onReply: (
    highlightId: string,
    parentId: string | null,
    body: string,
    authorName: string | null,
  ) => Promise<void>
  onReact: (highlightId: string, commentId: string, emoji: string) => Promise<void>
  onResolve: (highlightId: string, resolved: boolean) => Promise<void>
  onDelete: (highlightId: string, commentId?: string) => Promise<void>
}

const DEFAULT_HEIGHT = 100

/**
 * Right-rail container for comment cards, Google Docs-style.
 *
 * Each card is positioned absolutely at a constraint-solved top so cards
 * never overlap. Heights are measured live via ResizeObserver; positions
 * recompute on heights change, on `recomputeKey` (article resize / font
 * load), and on the highlights list itself.
 */
export function CommentRail(props: CommentRailProps) {
  const { highlights, articleEl, recomputeKey } = props
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [desiredTops, setDesiredTops] = useState<Record<string, number>>({})
  const observersRef = useRef(new Map<string, ResizeObserver>())

  // Compute desired tops from anchors
  useLayoutEffect(() => {
    if (!articleEl) return
    const articleRect = articleEl.getBoundingClientRect()
    const next: Record<string, number> = {}
    for (const h of highlights) {
      const range = anchorToRange(h.anchor, articleEl)
      if (!range) continue
      const r = range.getBoundingClientRect()
      next[h.id] = r.top - articleRect.top
    }
    setDesiredTops(next)
  }, [highlights, articleEl, recomputeKey])

  // Solve layout
  const visible = highlights.filter((h) => desiredTops[h.id] !== undefined)
  const specs: CardSpec[] = visible.map((h) => ({
    id: h.id,
    desiredTop: desiredTops[h.id]!,
    height: heights[h.id] ?? DEFAULT_HEIGHT,
  }))
  const tops = solveCardLayout(specs)

  // Tear down observers on unmount
  useEffect(() => {
    const observers = observersRef.current
    return () => {
      observers.forEach((ro) => ro.disconnect())
      observers.clear()
    }
  }, [])

  // Tear down observers for removed highlights
  useEffect(() => {
    const known = new Set(highlights.map((h) => h.id))
    observersRef.current.forEach((ro, id) => {
      if (!known.has(id)) {
        ro.disconnect()
        observersRef.current.delete(id)
      }
    })
  }, [highlights])

  function attachCardRef(id: string) {
    return (el: HTMLDivElement | null) => {
      const existing = observersRef.current.get(id)
      if (existing) {
        existing.disconnect()
        observersRef.current.delete(id)
      }
      if (!el) return
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const next = entry.contentRect.height
        setHeights((prev) => (prev[id] === next ? prev : { ...prev, [id]: next }))
      })
      ro.observe(el)
      observersRef.current.set(id, ro)
    }
  }

  if (visible.length === 0) return null

  // Total rail height: bottom of the lowest card
  const railHeight =
    Math.max(
      ...specs.map((s) => (tops.get(s.id) ?? 0) + (heights[s.id] ?? DEFAULT_HEIGHT)),
      0,
    )

  return (
    <div className='relative w-full' style={{ minHeight: railHeight }}>
      {visible.map((h) => (
        <div
          key={h.id}
          ref={attachCardRef(h.id)}
          className='absolute left-0 w-full'
          style={{ top: tops.get(h.id) ?? 0 }}
        >
          <CommentCard
            highlight={h}
            fingerprint={props.fingerprint}
            isOwner={props.isOwner}
            onReply={props.onReply}
            onReact={props.onReact}
            onResolve={props.onResolve}
            onDelete={props.onDelete}
          />
        </div>
      ))}
    </div>
  )
}
