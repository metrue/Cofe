/**
 * @jest-environment node
 */

import {
  checkCommentRateLimit,
  checkReactionRateLimit,
  clearAllRateLimits,
} from '@/lib/highlights/rateLimit'

describe('rateLimit', () => {
  beforeEach(() => clearAllRateLimits())

  it('allows up to max requests within the window', () => {
    const config = { max: 3, windowMs: 60_000 }
    const r1 = checkCommentRateLimit('fp1', config, 1000)
    const r2 = checkCommentRateLimit('fp1', config, 2000)
    const r3 = checkCommentRateLimit('fp1', config, 3000)
    expect([r1.allowed, r2.allowed, r3.allowed]).toEqual([true, true, true])
    expect(r3.remaining).toBe(0)
  })

  it('rejects beyond max within the window', () => {
    const config = { max: 2, windowMs: 60_000 }
    checkCommentRateLimit('fp1', config, 1000)
    checkCommentRateLimit('fp1', config, 2000)
    const r3 = checkCommentRateLimit('fp1', config, 3000)
    expect(r3.allowed).toBe(false)
    expect(r3.retryAfterMs).toBeGreaterThan(0)
  })

  it('decays older stamps outside the window', () => {
    const config = { max: 2, windowMs: 60_000 }
    checkCommentRateLimit('fp1', config, 1000)
    checkCommentRateLimit('fp1', config, 2000)
    // Now 70s later — old stamps are outside the window
    const r3 = checkCommentRateLimit('fp1', config, 71_000)
    expect(r3.allowed).toBe(true)
  })

  it('isolates fingerprints from each other', () => {
    const config = { max: 1, windowMs: 60_000 }
    expect(checkCommentRateLimit('fp1', config, 1000).allowed).toBe(true)
    expect(checkCommentRateLimit('fp2', config, 1000).allowed).toBe(true)
    expect(checkCommentRateLimit('fp1', config, 2000).allowed).toBe(false)
  })

  it('uses separate buckets for comment vs reaction limits', () => {
    const config = { max: 1, windowMs: 60_000 }
    expect(checkCommentRateLimit('fp1', config, 1000).allowed).toBe(true)
    // Reaction bucket is independent — fp1 hasn't hit reaction limit yet
    expect(checkReactionRateLimit('fp1', config, 1000).allowed).toBe(true)
  })

  it('returns retryAfterMs that reflects time until oldest stamp ages out', () => {
    const config = { max: 1, windowMs: 60_000 }
    checkCommentRateLimit('fp1', config, 0)
    const r = checkCommentRateLimit('fp1', config, 10_000)
    // Oldest stamp at t=0, window ends at t=60_000, current at t=10_000 → 50_000ms remaining
    expect(r.retryAfterMs).toBe(50_000)
  })
})
