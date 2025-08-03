import siteConfig from '@/data/site-config.json'

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