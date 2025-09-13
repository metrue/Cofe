import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://cofe.ai'
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/editor', '/login', '/unavailable'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}