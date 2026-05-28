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
  isOwner,
  parseBody,
} from '@/lib/highlights/server'
import {
  Highlight,
  HighlightAnchorSchema,
  PostHighlights,
} from '@/lib/highlights/schema'

const CreateHighlightBody = z.object({
  anchor: HighlightAnchorSchema,
  body: z.string().min(1).max(2000),
  authorName: z.string().max(40).nullable().optional(),
  // Honeypot — bots tend to fill every field; humans never see it.
  website: z.string().max(0).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const repo = getHighlightsRepo()
    const { data } = await repo.load(params.id)
    const identity = extractIdentity(request)
    const owner = await isOwner()
    return apiOk({
      ...data,
      currentFingerprint: identity.fingerprint,
      isOwner: owner,
    })
  } catch (err) {
    console.error('GET /highlights failed', err)
    return apiError('Failed to load highlights', 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await parseBody(req, CreateHighlightBody)
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

    const now = new Date().toISOString()
    const newHighlight: Highlight = {
      id: `hl_${randomUUID()}`,
      anchor: body.anchor,
      thread: [
        {
          id: `cm_${randomUUID()}`,
          parentId: null,
          body: body.body.trim(),
          authorName: body.authorName ?? null,
          fingerprint: identity.fingerprint,
          country: identity.country,
          platform: identity.platform,
          reactions: {},
          resolved: false,
          createdAt: now,
          hidden: false,
        },
      ],
      resolved: false,
      createdAt: now,
    }

    const updated: PostHighlights = {
      ...data,
      highlights: [...data.highlights, newHighlight],
    }

    await repo.save(params.id, updated, sha, `Add highlight on ${params.id}`)
    return apiOk({ highlight: newHighlight })
  } catch (err) {
    if (err instanceof ApiBodyError) return apiError(err.message, 400)
    console.error('POST /highlights failed', err)
    return apiError('Failed to create highlight', 500)
  }
}
