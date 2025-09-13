import crypto from 'crypto'
import { NextRequest } from 'next/server'

export interface LikeData {
  timestamp: string
  userAgent: string
  country: string
  language: string
}

export interface LikesDatabase {
  [itemKey: string]: {
    [likeId: string]: LikeData
  }
}

export interface LikeInfo {
  count: number
  countries: string[]
  userLiked: boolean
}

/**
 * Extract client IP address from request headers
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare
  
  const ip = (
    cfConnectingIP ||                    // Cloudflare
    forwarded?.split(',')[0]?.trim() ||  // Load balancer/proxy
    realIP ||                           // Nginx
    request.ip ||                       // Direct connection
    '127.0.0.1'                        // Fallback
  )
  
  return ip
}

/**
 * Extract location hints from browser headers
 */
export function getLocationFromHeaders(request: NextRequest) {
  const acceptLanguage = request.headers.get('accept-language') || ''
  const userAgent = request.headers.get('user-agent') || ''
  
  // Extract primary language and country hint
  const primaryLang = acceptLanguage.split(',')[0]?.trim() || 'unknown'
  const countryHint = primaryLang.includes('-') 
    ? primaryLang.split('-')[1]?.toUpperCase() 
    : 'UNKNOWN'
  
  return {
    country: countryHint,
    language: primaryLang,
    userAgent
  }
}

/**
 * Hash IP address for privacy
 */
export function hashIP(ip: string): string {
  const salt = process.env.LIKE_HASH_SALT || 'cofe-likes-salt-2025'
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex')
    .substring(0, 12) // First 12 chars for uniqueness while maintaining privacy
}

/**
 * Generate unique like ID
 */
export function generateLikeId(hashedIP: string, country: string, timestamp: string): string {
  return `${hashedIP}_${country}_${timestamp}`
}

/**
 * Check if user has already liked an item
 */
export function hasUserLiked(
  likesData: LikesDatabase,
  itemKey: string,
  hashedIP: string,
  country: string
): { hasLiked: boolean; existingLikeId?: string } {
  const itemLikes = likesData[itemKey] || {}
  
  // Find existing like from same hashed IP + country
  const existingLikeId = Object.keys(itemLikes).find(likeId =>
    likeId.startsWith(`${hashedIP}_${country}_`)
  )
  
  return {
    hasLiked: !!existingLikeId,
    existingLikeId
  }
}

/**
 * Get like statistics for an item
 */
export function getLikeInfo(
  likesData: LikesDatabase,
  itemKey: string,
  hashedIP: string,
  country: string
): LikeInfo {
  const itemLikes = likesData[itemKey] || {}
  const likes = Object.values(itemLikes)
  
  // Get unique countries
  const countries = Array.from(new Set(likes.map(like => like.country).filter(c => c !== 'UNKNOWN')))
  
  // Check if current user has liked
  const { hasLiked } = hasUserLiked(likesData, itemKey, hashedIP, country)
  
  return {
    count: likes.length,
    countries,
    userLiked: hasLiked
  }
}

/**
 * Format like display text
 */
export function formatLikeDisplay(likeInfo: LikeInfo): string {
  const { count, countries } = likeInfo
  
  if (count === 0) {
    return 'Be the first to like this'
  }
  
  if (count === 1) {
    return '1 like'
  }
  
  if (countries.length === 0) {
    return `${count} likes`
  }
  
  if (countries.length <= 3) {
    return `${count} likes from ${countries.join(', ')}`
  }
  
  return `${count} likes from ${countries.slice(0, 3).join(', ')} and ${countries.length - 3} more`
}

/**
 * Create item key for likes database
 */
export function createItemKey(type: 'blog' | 'memo', id: string): string {
  return `${type}_${id}`
}