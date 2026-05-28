import { NextRequest } from 'next/server'
import { z } from 'zod'

import { getHighlightsRepo } from '@/lib/highlights/highlightsRepo'
import {
  ApiBodyError,
  apiError,
  apiOk,
  getOwnerToken,
  isOwner,
  parseBody,
} from '@/lib/highlights/server'

const ResolveBody = z.object({
  resolved: z.boolean(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; hid: string } },
) {
  try {
    if (!(await isOwner())) return apiError('Owner authentication required', 403)
    const body = await parseBody(req, ResolveBody)

    const ownerToken = await getOwnerToken()
    const repo = getHighlightsRepo({ ownerToken })
    const { data, sha } = await repo.load(params.id)

    const target = data.highlights.find((h) => h.id === params.hid)
    if (!target) return apiError('Highlight not found', 404)
    if (target.resolved === body.resolved) {
      return apiOk({ highlight: target })
    }

    const updated = {
      ...data,
      highlights: data.highlights.map((h) =>
        h.id === params.hid ? { ...h, resolved: body.resolved } : h,
      ),
    }

    await repo.save(
      params.id,
      updated,
      sha,
      `${body.resolved ? 'Resolve' : 'Reopen'} highlight ${params.hid}`,
    )

    const next = updated.highlights.find((h) => h.id === params.hid)!
    return apiOk({ highlight: next })
  } catch (err) {
    if (err instanceof ApiBodyError) return apiError(err.message, 400)
    console.error('POST /resolve failed', err)
    return apiError('Failed to update highlight', 500)
  }
}
