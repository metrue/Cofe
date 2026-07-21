'use strict'

/**
 * Custom Next.js 14 CacheHandler that stores ISR/fetch cache entries under the
 * OS temp dir instead of `.next/cache`.
 *
 * On Vercel the standalone server runs from a read-only filesystem
 * (`/var/task`), so Next's default FileSystemCache throws
 * `ENOENT: mkdir '/var/task/.next/cache'`. That error is non-fatal but noisy —
 * routing cache writes to `os.tmpdir()` (writable on the platform) removes it.
 *
 * All filesystem access is wrapped in try/catch: a cache miss or write failure
 * must never throw, or it would take down the request it's caching.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

const CACHE_DIR = path.join(os.tmpdir(), 'cici-next-cache')

/** Turn an arbitrary cache key (may contain `/`, `:`, etc.) into a safe filename. */
function keyToFile(key) {
  const hash = crypto.createHash('sha256').update(String(key)).digest('hex')
  return path.join(CACHE_DIR, `${hash}.json`)
}

module.exports = class CacheHandler {
  constructor(options) {
    this.options = options
  }

  async get(key) {
    try {
      const raw = fs.readFileSync(keyToFile(key), 'utf-8')
      const parsed = JSON.parse(raw)
      return {
        value: parsed.value,
        lastModified: parsed.lastModified,
      }
    } catch (_err) {
      // Miss or unreadable entry — treat as no cache.
      return null
    }
  }

  async set(key, data, ctx) {
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
      const payload = JSON.stringify({
        value: data,
        lastModified: Date.now(),
        tags: ctx && ctx.tags ? ctx.tags : [],
      })
      fs.writeFileSync(keyToFile(key), payload, 'utf-8')
    } catch (_err) {
      // Never throw on cache write failure — the cache is best-effort.
    }
  }

  async revalidateTag(_tag) {
    // No-op: entries expire via Next's own revalidation metadata; we don't
    // maintain a tag index. Kept as a stub so the handler satisfies the API.
  }
}
