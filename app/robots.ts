import { MetadataRoute } from 'next'
import { getDynamicBaseUrl } from '@/lib/siteConfig'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getDynamicBaseUrl()
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/editor', '/login', '/unavailable'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}