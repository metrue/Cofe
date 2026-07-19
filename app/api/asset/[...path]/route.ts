import { NextRequest, NextResponse } from 'next/server'
import { isLocalMode } from '@/lib/runtime/mode'
import { readLocalAsset } from '@/lib/localAssets'

/**
 * Serve local image assets written by the local-mode editor, from
 * `<CICI_DIR>/assets/<path>`. Path-guarded against traversal.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!isLocalMode()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const asset = readLocalAsset(params.path ?? [])
  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(asset.body), {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
