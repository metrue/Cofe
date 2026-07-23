import { getProvider } from '@/lib/runtime/provider'
import { getDynamicBaseUrl } from '@/lib/siteConfig'
import type { BlogPost } from '@/lib/types'

export const revalidate = 3600

export async function GET() {
  const client = getProvider()
  const baseUrl = await getDynamicBaseUrl()

  let posts: BlogPost[] = []
  try {
    posts = await client.getBlogPosts()
  } catch (error) {
    console.error('Error fetching blog posts for RSS:', error)
  }

  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const items = sorted
    .map((post) => {
      const pubDate = new Date(post.date).toUTCString()
      const link = `${baseUrl}/blog/${encodeURIComponent(post.id)}`
      const description = (post.content || '')
        .replace(/^---[\s\S]*?---\n?/, '')
        .replace(/#{1,6}\s+/g, '')
        .replace(/[*_`[\]()!]/g, '')
        .trim()
        .slice(0, 300)

      return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`
    })
    .join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>cici Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Blog posts from cici</description>
    <language>en</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
