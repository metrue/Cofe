import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getProvider } from '@/lib/runtime/provider'

/**
 * Image upload — one endpoint for every backend. Routes the file through the
 * active provider's `uploadAsset`:
 *   - local (`--dir`)  → writes to <dir>/assets, returns an /api/asset/… URL
 *   - github           → commits to the repo, returns a raw GitHub URL
 * Requires a writable provider (local, or GitHub with a token / session).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const provider = getProvider(session?.accessToken)

  if (!provider.canWrite()) {
    return NextResponse.json(
      { error: 'This cici instance is read-only.' },
      { status: 403 }
    )
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    const url = await provider.uploadAsset(file as unknown as File)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
