'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { rangeToAnchor } from '@/lib/highlights/anchoring'
import {
  createHighlight,
  createReply,
  deleteComment,
  deleteHighlight,
  fetchHighlights,
  setHighlightResolved,
  toggleReaction,
} from '@/lib/highlights/clientApi'
import { Highlight, HighlightAnchor } from '@/lib/highlights/schema'

import { CommentCard } from './CommentCard'
import { CommentComposer } from './CommentComposer'
import { CommentRail } from './CommentRail'
import { HighlightMark } from './HighlightMark'
import { SelectionToolbar } from './SelectionToolbar'

interface HighlightLayerProps {
  postId: string
  children: React.ReactNode
}

/**
 * Top-level orchestrator for the inline-comments feature on a blog post.
 *
 * Wraps the post's article content with:
 *   - selection capture + floating "+" toolbar
 *   - overlay highlight marks
 *   - right-rail of Google Docs-style comment cards
 *   - composer for new highlights and replies
 *
 * Does not modify `BlogPostContent` — the article DOM stays untouched and
 * we render anchored marks/cards on top.
 */
export function HighlightLayer({ postId, children }: HighlightLayerProps) {
  const articleRef = useRef<HTMLDivElement>(null)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [pending, setPending] = useState<HighlightAnchor | null>(null)
  const [recomputeKey, setRecomputeKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Fetch highlights on mount
  useEffect(() => {
    let cancelled = false
    fetchHighlights(postId)
      .then((data) => {
        if (cancelled) return
        setHighlights(data.highlights)
        setFingerprint(data.currentFingerprint)
        setIsOwner(data.isOwner)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load highlights', err)
        }
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  // Recompute marks/cards on article resize, font load, scroll-zoom
  useEffect(() => {
    const article = articleRef.current
    if (!article) return
    const ro = new ResizeObserver(() => setRecomputeKey((k) => k + 1))
    ro.observe(article)
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => setRecomputeKey((k) => k + 1)).catch(() => {})
    }
    window.addEventListener('resize', () => setRecomputeKey((k) => k + 1))
    return () => ro.disconnect()
  }, [])

  // Handlers — keep optimistic UI: append/update local state, server is source on next reload
  const handleAddComment = useCallback(() => {
    const sel = document.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const article = articleRef.current
    if (!article) return
    const anchor = rangeToAnchor(range, article)
    if (!anchor) return
    setPending(anchor)
    sel.removeAllRanges()
  }, [])

  const handleSubmitNew = useCallback(
    async (body: string, authorName: string | null) => {
      if (!pending) return
      try {
        const { highlight } = await createHighlight(postId, {
          anchor: pending,
          body,
          authorName,
        })
        setHighlights((prev) => [...prev, highlight])
        setPending(null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to comment')
        throw err
      }
    },
    [pending, postId],
  )

  const handleReply = useCallback(
    async (highlightId: string, parentId: string | null, body: string, authorName: string | null) => {
      const { comment } = await createReply(postId, highlightId, { parentId, body, authorName })
      setHighlights((prev) =>
        prev.map((h) => (h.id === highlightId ? { ...h, thread: [...h.thread, comment] } : h)),
      )
    },
    [postId],
  )

  const handleReact = useCallback(
    async (highlightId: string, commentId: string, emoji: string) => {
      const { reactions } = await toggleReaction(postId, highlightId, commentId, emoji)
      setHighlights((prev) =>
        prev.map((h) =>
          h.id === highlightId
            ? {
                ...h,
                thread: h.thread.map((c) => (c.id === commentId ? { ...c, reactions } : c)),
              }
            : h,
        ),
      )
    },
    [postId],
  )

  const handleResolve = useCallback(
    async (highlightId: string, resolved: boolean) => {
      const { highlight } = await setHighlightResolved(postId, highlightId, resolved)
      setHighlights((prev) => prev.map((h) => (h.id === highlightId ? highlight : h)))
    },
    [postId],
  )

  const handleDelete = useCallback(
    async (highlightId: string, commentId?: string) => {
      if (commentId) {
        const res = await deleteComment(postId, highlightId, commentId)
        if (res.removedHighlight) {
          setHighlights((prev) => prev.filter((h) => h.id !== highlightId))
        } else {
          setHighlights((prev) =>
            prev.map((h) =>
              h.id === highlightId
                ? { ...h, thread: h.thread.filter((c) => c.id !== commentId) }
                : h,
            ),
          )
        }
      } else {
        await deleteHighlight(postId, highlightId)
        setHighlights((prev) => prev.filter((h) => h.id !== highlightId))
      }
    },
    [postId],
  )

  const article = articleRef.current

  return (
    <div className='relative mx-auto w-full max-w-7xl'>
      <div ref={articleRef} className='relative'>
        {children}
        {highlights.map((h) => (
          <HighlightMark
            key={h.id}
            highlight={h}
            articleEl={article}
            recomputeKey={recomputeKey}
          />
        ))}
        <SelectionToolbar
          containerRef={articleRef}
          onAddComment={handleAddComment}
          suppressed={!!pending}
        />
      </div>

      {/* Composer — appears in the rail when a new highlight is being drafted. */}
      <aside className='pointer-events-none absolute right-0 top-0 hidden w-72 lg:block'>
        <div className='pointer-events-auto sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pl-4'>
          {pending && (
            <div className='mb-3 rounded-lg border-2 border-amber-300 bg-amber-50/40 p-2'>
              <div className='mb-2 text-xs text-amber-900'>
                Commenting on “{pending.exact.slice(0, 40)}{pending.exact.length > 40 ? '…' : ''}”
              </div>
              <CommentComposer
                placeholder='Add a comment…'
                submitLabel='Comment'
                onSubmit={handleSubmitNew}
                onCancel={() => setPending(null)}
              />
            </div>
          )}
          {error && (
            <div className='mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700'>
              {error}
            </div>
          )}
          <CommentRail
            highlights={highlights}
            articleEl={article}
            recomputeKey={recomputeKey}
            fingerprint={fingerprint}
            isOwner={isOwner}
            onReply={handleReply}
            onReact={handleReact}
            onResolve={handleResolve}
            onDelete={handleDelete}
          />
        </div>
      </aside>

      {/* Mobile fallback: bottom sheet for any active composer or thread.
          Phase 8 will flesh out — for v1 we tap into the same components. */}
      {pending && (
        <div className='fixed inset-x-0 bottom-0 z-50 border-t border-amber-200 bg-white p-3 shadow-lg lg:hidden'>
          <div className='mx-auto max-w-3xl'>
            <div className='mb-2 text-xs text-amber-900'>
              Commenting on “{pending.exact.slice(0, 40)}{pending.exact.length > 40 ? '…' : ''}”
            </div>
            <CommentComposer
              placeholder='Add a comment…'
              submitLabel='Comment'
              onSubmit={handleSubmitNew}
              onCancel={() => setPending(null)}
            />
          </div>
        </div>
      )}

      {/* Mobile: existing highlights as a stacked list under the article. */}
      {highlights.length > 0 && (
        <div className='mt-6 space-y-3 px-4 lg:hidden'>
          <h2 className='text-sm font-semibold text-gray-700'>Inline comments</h2>
          {highlights.map((h) => (
            <CommentCard
              key={h.id}
              highlight={h}
              fingerprint={fingerprint}
              isOwner={isOwner}
              onReply={handleReply}
              onReact={handleReact}
              onResolve={handleResolve}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
