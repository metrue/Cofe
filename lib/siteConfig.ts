// Build-time static import: the path must be a literal, so it cannot go through
// contentPaths. The runtime read/write source of truth is contentPaths.siteConfig()
// (used by client.ts / publicClient.ts / localClient.server.ts). Keep this literal
// in sync with contentPaths.siteConfig() if the content layout ever moves.
import siteConfig from '@/data/site-config.json'
import { headers } from 'next/headers'

export interface SiteConfig {
  title: string
  description: string
  author: {
    name: string
    bio: string
    location: string
  }
  keywords: string[]
  social: {
    github: string
    twitter: string
  }
}

export function getSiteConfig(): SiteConfig {
  return siteConfig
}

export function getDynamicBaseUrl(): string {
  try {
    const headersList = headers()
    const host = headersList.get('host')
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    
    if (host) {
      return `${protocol}://${host}`
    }
  } catch (error) {
    // Fall back to a default URL if headers are not available
    console.warn('Could not get dynamic base URL, falling back to default:', error)
  }
  
  // Fallback for build time or when headers are not available
  return 'https://blog.minghe.me'
}