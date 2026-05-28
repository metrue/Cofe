/**
 * Sliding-window rate limiter.
 *
 * Used to throttle anonymous comment creation per fingerprint. Defaults are
 * tuned for an inline-comments use case where heavy commenting is suspect:
 *   - Comment / reply: 5 actions / 10 min
 *   - Reaction toggle: 30 actions / 10 min
 *
 * Implementation: in-memory `Map<key, ring of timestamps>`. Per-instance, not
 * cross-instance — good enough for a personal blog with a single Vercel
 * function. Replace with Upstash Redis if traffic warrants.
 */

const COMMENT_BUCKET = Symbol('comment')
const REACTION_BUCKET = Symbol('reaction')

const buckets = new Map<symbol, Map<string, number[]>>()

export interface RateLimitConfig {
  max: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

export const COMMENT_LIMIT: RateLimitConfig = { max: 5, windowMs: 10 * 60_000 }
export const REACTION_LIMIT: RateLimitConfig = { max: 30, windowMs: 10 * 60_000 }

export function checkCommentRateLimit(
  key: string,
  config: RateLimitConfig = COMMENT_LIMIT,
  now: number = Date.now(),
): RateLimitResult {
  return checkRateLimit(COMMENT_BUCKET, key, config, now)
}

export function checkReactionRateLimit(
  key: string,
  config: RateLimitConfig = REACTION_LIMIT,
  now: number = Date.now(),
): RateLimitResult {
  return checkRateLimit(REACTION_BUCKET, key, config, now)
}

export function clearAllRateLimits(): void {
  buckets.clear()
}

function checkRateLimit(
  scope: symbol,
  key: string,
  { max, windowMs }: RateLimitConfig,
  now: number,
): RateLimitResult {
  const bucket = getOrCreate(scope)
  const cutoff = now - windowMs
  const stamps = (bucket.get(key) ?? []).filter((t) => t > cutoff)

  if (stamps.length >= max) {
    const oldestInWindow = stamps[0]
    bucket.set(key, stamps)
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, windowMs - (now - oldestInWindow)),
    }
  }

  stamps.push(now)
  bucket.set(key, stamps)
  return {
    allowed: true,
    remaining: max - stamps.length,
    retryAfterMs: 0,
  }
}

function getOrCreate(scope: symbol): Map<string, number[]> {
  let bucket = buckets.get(scope)
  if (!bucket) {
    bucket = new Map()
    buckets.set(scope, bucket)
  }
  return bucket
}
