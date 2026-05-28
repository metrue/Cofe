import { NextRequest } from 'next/server'

import { getHighlightsRepo } from '@/lib/highlights/highlightsRepo'
import { apiError, apiErrorFrom, apiOk, getOwnerToken, isOwner } from '@/lib/highlights/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; hid: string; cid: string } },
) {
  try {
    if (!(await isOwner())) return apiError('Owner authentication required', 403)

    const ownerToken = await getOwnerToken()
    const repo = getHighlightsRepo({ ownerToken })
    const { data, sha } = await repo.load(params.id)

    const highlight = data.highlights.find((h) => h.id === params.hid)
    if (!highlight) return apiError('Highlight not found', 404)
    if (!highlight.thread.some((c) => c.id === params.cid)) {
      return apiError('Comment not found', 404)
    }

    // Deleting the root comment removes the entire highlight.
    const isRoot = highlight.thread[0]?.id === params.cid
    let updated
    if (isRoot) {
      updated = {
        ...data,
        highlights: data.highlights.filter((h) => h.id !== params.hid),
      }
    } else {
      updated = {
        ...data,
        highlights: data.highlights.map((h) =>
          h.id === params.hid
            ? { ...h, thread: h.thread.filter((c) => c.id !== params.cid) }
            : h,
        ),
      }
    }

    await repo.save(
      params.id,
      updated,
      sha,
      `Delete comment ${params.cid}${isRoot ? ' (and parent highlight)' : ''}`,
    )
    return apiOk({ ok: true, removedHighlight: isRoot })
  } catch (err) {
    return apiErrorFrom(err, 'Failed to delete comment')
  }
}
