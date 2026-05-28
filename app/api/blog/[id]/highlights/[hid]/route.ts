import { NextRequest } from 'next/server'

import { getHighlightsRepo } from '@/lib/highlights/highlightsRepo'
import { apiError, apiOk, getOwnerToken, isOwner } from '@/lib/highlights/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; hid: string } },
) {
  try {
    if (!(await isOwner())) return apiError('Owner authentication required', 403)

    const ownerToken = await getOwnerToken()
    const repo = getHighlightsRepo({ ownerToken })
    const { data, sha } = await repo.load(params.id)

    if (!data.highlights.some((h) => h.id === params.hid)) {
      return apiError('Highlight not found', 404)
    }

    const updated = {
      ...data,
      highlights: data.highlights.filter((h) => h.id !== params.hid),
    }

    await repo.save(params.id, updated, sha, `Delete highlight ${params.hid}`)
    return apiOk({ ok: true })
  } catch (err) {
    console.error('DELETE /highlights/[hid] failed', err)
    return apiError('Failed to delete highlight', 500)
  }
}
