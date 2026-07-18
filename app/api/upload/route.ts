import { NextRequest, NextResponse } from 'next/server'
import { isLocalMode } from '@/lib/runtime/mode'
import { saveLocalAsset } from '@/lib/localAssets'

/**
 * Local-mode image upload (`npx cofe --data`). Writes the file to
 * `<COFE_DATA_DIR>/assets/images/<date>/…` and returns its `/api/asset/…` URL.
 *
 * In GitHub mode the editor uploads directly via the GitHub API (with the user's
 * token) and never hits this route, so it's only enabled in local mode.
 */
export async function POST(request: NextRequest) {
  if (!isLocalMode()) {
    return NextResponse.json({ error: 'Uploads via this route are only available in local mode.' }, { status: 400 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    const url = await saveLocalAsset(file as unknown as File, {
      date: new Date().toISOString().split('T')[0],
      id: Date.now().toString(),
    })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Local upload failed:', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
