import { MetadataRoute } from 'next'
import { getDynamicBaseUrl } from '@/lib/siteConfig'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getDynamicBaseUrl()
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/editor', '/login', '/unavailable'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}