/**
 * Local image asset storage for `npx cofe --data` mode (server-only).
 *
 * Uploads are written under `<COFE_DIR>/assets/images/<date>/<file>` and
 * served back through `/api/asset/<path>`. Mirrors how the GitHub backend stores
 * images under `assets/images/<date>/…` in the repo.
 */

import fs from 'fs'
import path from 'path'
import { localDataDir } from './runtime/mode'

const ASSETS_SUBDIR = 'assets'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}

function assetsRoot(): string {
  return path.join(localDataDir(), ASSETS_SUBDIR)
}

function extFor(filename: string, mime?: string): string {
  const fromName = path.extname(filename || '').toLowerCase()
  if (fromName && MIME_BY_EXT[fromName]) return fromName
  if (mime) {
    const guess = `.${mime.split('/')[1] || ''}`.toLowerCase()
    if (MIME_BY_EXT[guess]) return guess
  }
  return fromName || '.png'
}

/**
 * Persist an uploaded image to disk. Returns the public URL to reference it.
 * `id` makes the filename deterministic-per-call from the caller (avoids
 * Date.now() here so callers control naming/testing).
 */
export async function saveLocalAsset(
  file: { name: string; type?: string; arrayBuffer: () => Promise<ArrayBuffer> },
  opts: { date: string; id: string }
): Promise<string> {
  const ext = extFor(file.name, file.type)
  const relDir = path.posix.join('images', opts.date)
  const filename = `${opts.id}${ext}`
  const absDir = path.join(assetsRoot(), relDir)
  fs.mkdirSync(absDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(path.join(absDir, filename), buffer)
  // URL the browser/markdown will use; served by app/api/asset/[...path].
  return `/api/asset/${relDir}/${filename}`
}

/**
 * Read a local asset by its `/api/asset/<relPath>` path. Returns null if it
 * doesn't exist or the path escapes the assets root.
 */
export function readLocalAsset(
  segments: string[]
): { body: Buffer; contentType: string } | null {
  // Reject traversal / absolute escapes.
  if (segments.some((s) => !s || s === '..' || s.includes('\0') || s.includes('/') || s.includes('\\'))) {
    return null
  }
  const root = assetsRoot()
  const target = path.resolve(root, ...segments)
  if (target !== root && !target.startsWith(root + path.sep)) {
    return null
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return null
  }
  const ext = path.extname(target).toLowerCase()
  return {
    body: fs.readFileSync(target),
    contentType: MIME_BY_EXT[ext] ?? 'application/octet-stream',
  }
}
