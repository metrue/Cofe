import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { getHighlightsRepo } from '@/lib/highlights/highlightsRepo'
import { checkCommentRateLimit } from '@/lib/highlights/rateLimit'
import {
  ApiBodyError,
  apiError,
  apiOk,
  extractIdentity,
  parseBody,
} from '@/lib/highlights/server'
import { InlineComment } from '@/lib/highlights/schema'

const ReplyBody = z.object({
  parentId: z.string().min(1).max(64).nullable().optional(),
  body: z.string().min(1).max(2000),
  authorName: z.string().max(40).nullable().optional(),
  website: z.string().max(0).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; hid: string } },
) {
  try {
    const body = await parseBody(req, ReplyBody)
    if (body.website && body.website.length > 0) {
      return apiError('Rejected', 400)
    }

    const identity = extractIdentity(req)
    const rl = checkCommentRateLimit(identity.fingerprint)
    if (!rl.allowed) {
      return apiError(
        `Too many comments. Retry after ${Math.ceil(rl.retryAfterMs / 1000)}s`,
        429,
      )
    }

    const repo = getHighlightsRepo()
    const { data, sha } = await repo.load(params.id)

    const target = data.highlights.find((h) => h.id === params.hid)
    if (!target) return apiError('Highlight not found', 404)

    if (body.parentId && !target.thread.some((c) => c.id === body.parentId)) {
      return apiError('Parent comment not found in this thread', 400)
    }

    const now = new Date().toISOString()
    const reply: InlineComment = {
      id: `cm_${randomUUID()}`,
      parentId: body.parentId ?? null,
      body: body.body.trim(),
      authorName: body.authorName ?? null,
      fingerprint: identity.fingerprint,
      country: identity.country,
      platform: identity.platform,
      reactions: {},
      resolved: false,
      createdAt: now,
      hidden: false,
    }

    const updated = {
      ...data,
      highlights: data.highlights.map((h) =>
        h.id === params.hid ? { ...h, thread: [...h.thread, reply] } : h,
      ),
    }

    await repo.save(params.id, updated, sha, `Reply on ${params.hid}`)
    return apiOk({ comment: reply })
  } catch (err) {
    if (err instanceof ApiBodyError) return apiError(err.message, 400)
    console.error('POST /highlights/[hid]/replies failed', err)
    return apiError('Failed to add reply', 500)
  }
}
