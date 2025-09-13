import siteConfig from '@/data/site-config.json'
import { headers } from 'next/headers'

export interface SiteConfig {
  title: string
  description: string
  baseUrl: string
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

export function getBaseUrl(): string {
  return siteConfig.baseUrl
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
    // Fall back to static config if headers are not available
    console.warn('Could not get dynamic base URL, falling back to site config:', error)
  }
  
  return siteConfig.baseUrl
}