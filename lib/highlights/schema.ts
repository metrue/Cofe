/**
 * Zod schemas + inferred types for inline highlight comments.
 *
 * Storage shape: one JSON file per post at `data/highlights/<post-slug>.json`,
 * structured as a `PostHighlights` blob.
 */

import { z } from 'zod'

/**
 * W3C Web Annotation-inspired anchor.
 *
 * Combines a TextPositionSelector (startOffset/endOffset, fast path) with a
 * TextQuoteSelector (prefix/exact/suffix, resilient when offsets shift). On
 * restore, callers should try offsets first, then fall back to the quote.
 */
export const HighlightAnchorSchema = z
  .object({
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().nonnegative(),
    exact: z.string().min(1).max(1000),
    prefix: z.string().max(64),
    suffix: z.string().max(64),
  })
  .refine((d) => d.endOffset >= d.startOffset, {
    message: 'endOffset must be >= startOffset',
  })

export type HighlightAnchor = z.infer<typeof HighlightAnchorSchema>

/** Reactions: emoji → array of fingerprints that reacted. */
export const ReactionsSchema = z.record(z.string(), z.array(z.string()))

export type Reactions = z.infer<typeof ReactionsSchema>

export const PlatformSchema = z.enum(['ios', 'android', 'web'])
export type Platform = z.infer<typeof PlatformSchema>

export const InlineCommentSchema = z.object({
  id: z.string().min(1).max(64),
  parentId: z.string().min(1).max(64).nullable(),
  body: z.string().min(1).max(2000),
  authorName: z.string().max(40).nullable(),
  fingerprint: z.string().min(1).max(128),
  country: z.string().max(8),
  platform: PlatformSchema,
  reactions: ReactionsSchema,
  resolved: z.boolean(),
  createdAt: z.string().datetime(),
  hidden: z.boolean(),
  hiddenReason: z.string().max(200).optional(),
})

export type InlineComment = z.infer<typeof InlineCommentSchema>

export const HighlightSchema = z.object({
  id: z.string().min(1).max(64),
  anchor: HighlightAnchorSchema,
  thread: z.array(InlineCommentSchema).min(1),
  resolved: z.boolean(),
  createdAt: z.string().datetime(),
})

export type Highlight = z.infer<typeof HighlightSchema>

export const PostHighlightsSchema = z.object({
  postId: z.string().min(1),
  highlights: z.array(HighlightSchema),
  schemaVersion: z.literal(1),
})

export type PostHighlights = z.infer<typeof PostHighlightsSchema>

/** Empty `PostHighlights` blob for a post that has no highlights yet. */
export function emptyPostHighlights(postId: string): PostHighlights {
  return { postId, highlights: [], schemaVersion: 1 }
}
