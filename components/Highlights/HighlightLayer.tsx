'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { anchorToRange, rangeToAnchor } from '@/lib/highlights/anchoring'
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
 *   - right-rail of Google Docs-style comment cards (lg+)
 *   - composer for new highlights, vertically aligned to the selection
 *   - bottom-sheet composer + stacked cards on narrow viewports
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
  const [pendingTop, setPendingTop] = useState<number | null>(null)
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
    const onResize = () => setRecomputeKey((k) => k + 1)
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // Recompute pending composer top from the pending anchor
  useEffect(() => {
    if (!pending) {
      setPendingTop(null)
      return
    }
    const article = articleRef.current
    if (!article) return
    const range = anchorToRange(pending, article)
    if (!range) {
      setPendingTop(0)
      return
    }
    const articleRect = article.getBoundingClientRect()
    const rangeRect = range.getBoundingClientRect()
    setPendingTop(rangeRect.top - articleRect.top)
  }, [pending, recomputeKey])

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
  const pendingPreview = pending
    ? pending.exact.slice(0, 40) + (pending.exact.length > 40 ? '…' : '')
    : ''

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

      {/* Right-rail (lg+): composer at the selection's vertical top, plus existing cards. */}
      <aside className='absolute right-0 top-0 hidden w-72 lg:block'>
        <div className='relative pl-4'>
          {pending && pendingTop !== null && (
            <div
              className='absolute left-4 right-0'
              style={{ top: pendingTop }}
            >
              <div className='rounded-lg border border-primary/40 bg-card p-2 shadow-sm'>
                <div className='mb-2 text-xs text-muted-foreground'>
                  Commenting on “{pendingPreview}”
                </div>
                <CommentComposer
                  placeholder='Add a comment…'
                  submitLabel='Comment'
                  onSubmit={handleSubmitNew}
                  onCancel={() => {
                    setPending(null)
                    setError(null)
                  }}
                />
                {error && (
                  <div className='mt-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive'>
                    {error}
                  </div>
                )}
              </div>
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

      {/* Mobile (< lg): composer as a centered bottom sheet matching post body width. */}
      {pending && (
        <div className='fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pt-2 lg:hidden'>
          <div className='mx-auto max-w-3xl rounded-lg border border-border bg-card p-3 shadow-lg'>
            <div className='mb-2 text-xs text-muted-foreground'>
              Commenting on “{pendingPreview}”
            </div>
            <CommentComposer
              placeholder='Add a comment…'
              submitLabel='Comment'
              onSubmit={handleSubmitNew}
              onCancel={() => {
                setPending(null)
                setError(null)
              }}
            />
            {error && (
              <div className='mt-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive'>
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile: existing highlights as a stacked list under the article. */}
      {highlights.length > 0 && (
        <div className='mt-6 space-y-3 px-4 lg:hidden'>
          <h2 className='text-sm font-semibold text-muted-foreground'>Inline comments</h2>
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
