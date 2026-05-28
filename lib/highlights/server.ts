/**
 * Server-side helpers shared by `app/api/blog/[id]/highlights/**` routes.
 *
 * Centralises:
 *   - Anonymous fingerprinting (reused from `lib/likeUtils.ts`)
 *   - Owner authentication via NextAuth
 *   - Standard `ApiResponse<T>` envelope
 *   - Validation primitives
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import {
  createUserFingerprint,
  detectPlatform,
  getClientIP,
  getLocationFromHeaders,
  hashIP,
} from '@/lib/likeUtils'
import { getSession } from '@/lib/auth'
import { Platform } from './schema'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, init)
}

export function apiError(message: string, status = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>({ success: false, error: message }, { status })
}

export interface RequestIdentity {
  fingerprint: string
  country: string
  platform: Platform
}

export function extractIdentity(request: NextRequest): RequestIdentity {
  const ip = getClientIP(request)
  const location = getLocationFromHeaders(request)
  const hashedIP = hashIP(ip)
  const fingerprint = createUserFingerprint(hashedIP, location)
  return {
    fingerprint,
    country: location.country,
    platform: detectPlatform(location.userAgent) as Platform,
  }
}

export async function isOwner(): Promise<boolean> {
  const session = await getSession()
  const owner = process.env.GITHUB_USERNAME
  if (!session?.user?.username || !owner) return false
  return session.user.username === owner
}

export async function getOwnerToken(): Promise<string | undefined> {
  const session = await getSession()
  return session?.accessToken
}

/**
 * Parse + validate JSON body. Returns the parsed value, or throws an
 * `ApiBodyError` with a useful message that callers can convert to 400.
 */
export class ApiBodyError extends Error {}

export async function parseBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new ApiBodyError('Invalid JSON body')
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new ApiBodyError(
      result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
    )
  }
  return result.data
}
