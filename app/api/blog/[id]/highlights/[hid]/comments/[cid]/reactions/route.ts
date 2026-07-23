import { NextRequest } from 'next/server'
import { z } from 'zod'

import { getHighlightsRepo } from '@/lib/highlights/highlightsRepo'
import { checkReactionRateLimit } from '@/lib/highlights/rateLimit'
import {
  ApiBodyError,
  apiError,
  apiErrorFrom,
  apiOk,
  extractIdentity,
  parseBody,
} from '@/lib/highlights/server'
import { Reactions } from '@/lib/highlights/schema'

const ReactionBody = z.object({
  emoji: z.string().min(1).max(8),
})

export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; hid: string; cid: string }> },
) {
  try {
    const params = await paramsPromise
    const body = await parseBody(req, ReactionBody)
    const identity = extractIdentity(req)

    const rl = checkReactionRateLimit(identity.fingerprint)
    if (!rl.allowed) {
      return apiError(
        `Too many reactions. Retry after ${Math.ceil(rl.retryAfterMs / 1000)}s`,
        429,
      )
    }

    const repo = getHighlightsRepo()
    const { data, sha } = await repo.load(params.id)

    const highlight = data.highlights.find((h) => h.id === params.hid)
    if (!highlight) return apiError('Highlight not found', 404)
    const comment = highlight.thread.find((c) => c.id === params.cid)
    if (!comment) return apiError('Comment not found', 404)

    const reactions: Reactions = { ...comment.reactions }
    const current = reactions[body.emoji] ?? []
    const idx = current.indexOf(identity.fingerprint)
    const next = idx === -1 ? [...current, identity.fingerprint] : current.filter((_, i) => i !== idx)

    if (next.length === 0) {
      delete reactions[body.emoji]
    } else {
      reactions[body.emoji] = next
    }

    const updated = {
      ...data,
      highlights: data.highlights.map((h) =>
        h.id === params.hid
          ? {
              ...h,
              thread: h.thread.map((c) =>
                c.id === params.cid ? { ...c, reactions } : c,
              ),
            }
          : h,
      ),
    }

    await repo.save(
      params.id,
      updated,
      sha,
      `Toggle reaction ${body.emoji} on ${params.cid}`,
    )

    return apiOk({ reactions })
  } catch (err) {
    if (err instanceof ApiBodyError) return apiError(err.message, 400)
    return apiErrorFrom(err, 'Failed to toggle reaction')
  }
}
