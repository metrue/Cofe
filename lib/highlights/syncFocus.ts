/**
 * Lightweight pub-sub for highlight ↔ comment-card focus sync.
 *
 * Both the `<HighlightMark>` overlay and the `<CommentCard>` subscribe to
 * the same focused-highlight id. Either side can call `setFocused()` to
 * surface a highlight in both places (mark thickens border, card scrolls
 * into view + flashes).
 */

import { useEffect, useState } from 'react'

type Listener = (id: string | null) => void

let focusedId: string | null = null
const listeners = new Set<Listener>()

export function setFocused(id: string | null): void {
  if (focusedId === id) return
  focusedId = id
  listeners.forEach((l) => l(id))
}

export function getFocused(): string | null {
  return focusedId
}

export function useFocusedHighlight(): string | null {
  const [id, setId] = useState<string | null>(focusedId)
  useEffect(() => {
    listeners.add(setId)
    return () => {
      listeners.delete(setId)
    }
  }, [])
  return id
}
