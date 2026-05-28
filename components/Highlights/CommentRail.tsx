'use client'

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { anchorToRange } from '@/lib/highlights/anchoring'
import { CardSpec, solveCardLayout } from '@/lib/highlights/cardLayout'
import { Highlight, HighlightAnchor } from '@/lib/highlights/schema'

import { CommentCard } from './CommentCard'

const PENDING_ID = '__pending__'

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
  /**
   * In-progress new highlight, when the user has clicked "+" but hasn't
   * submitted yet. Rendered as a pseudo-card in the rail so the constraint
   * solver places it without overlapping existing cards.
   */
  pending?: {
    anchor: HighlightAnchor
    composer: ReactNode
  }
}

const DEFAULT_HEIGHT = 100

/**
 * Right-rail container for comment cards, Google Docs-style.
 *
 * Each card is positioned absolutely at a constraint-solved top so cards
 * never overlap. Heights are measured live via ResizeObserver; positions
 * recompute on heights change, on `recomputeKey` (article resize / font
 * load), and on the highlights list itself.
 *
 * The pending composer (if any) participates in the same layout so it
 * never overlaps existing cards either.
 */
export function CommentRail(props: CommentRailProps) {
  const { highlights, articleEl, recomputeKey, pending } = props
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [desiredTops, setDesiredTops] = useState<Record<string, number>>({})
  const observersRef = useRef(new Map<string, ResizeObserver>())

  // Compute desired tops from anchors (including the pending one)
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
    if (pending) {
      const range = anchorToRange(pending.anchor, articleEl)
      if (range) {
        const r = range.getBoundingClientRect()
        next[PENDING_ID] = r.top - articleRect.top
      } else {
        next[PENDING_ID] = 0
      }
    }
    setDesiredTops(next)
  }, [highlights, articleEl, recomputeKey, pending])

  // Solve layout — cards + pending share one solver
  const visibleCards = highlights.filter((h) => desiredTops[h.id] !== undefined)
  const specs: CardSpec[] = visibleCards.map((h) => ({
    id: h.id,
    desiredTop: desiredTops[h.id]!,
    height: heights[h.id] ?? DEFAULT_HEIGHT,
  }))
  if (pending && desiredTops[PENDING_ID] !== undefined) {
    specs.push({
      id: PENDING_ID,
      desiredTop: desiredTops[PENDING_ID]!,
      height: heights[PENDING_ID] ?? DEFAULT_HEIGHT,
    })
  }
  const tops = solveCardLayout(specs)

  // Tear down observers on unmount
  useEffect(() => {
    const observers = observersRef.current
    return () => {
      observers.forEach((ro) => ro.disconnect())
      observers.clear()
    }
  }, [])

  // Tear down observers for removed highlights / cleared pending
  useEffect(() => {
    const known = new Set<string>(highlights.map((h) => h.id))
    if (pending) known.add(PENDING_ID)
    observersRef.current.forEach((ro, id) => {
      if (!known.has(id)) {
        ro.disconnect()
        observersRef.current.delete(id)
      }
    })
  }, [highlights, pending])

  function attachItemRef(id: string) {
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

  if (specs.length === 0) return null

  // Total rail height: bottom of the lowest item
  const railHeight = Math.max(
    ...specs.map((s) => (tops.get(s.id) ?? 0) + (heights[s.id] ?? DEFAULT_HEIGHT)),
    0,
  )

  return (
    <div className='relative w-full' style={{ minHeight: railHeight }}>
      {visibleCards.map((h) => (
        <div
          key={h.id}
          ref={attachItemRef(h.id)}
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
      {pending && desiredTops[PENDING_ID] !== undefined && (
        <div
          ref={attachItemRef(PENDING_ID)}
          className='absolute left-0 w-full'
          style={{ top: tops.get(PENDING_ID) ?? 0 }}
        >
          {pending.composer}
        </div>
      )}
    </div>
  )
}
