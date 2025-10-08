import { createOptimizedGitHubClient } from '@/lib/client'
import { getDynamicBaseUrl } from '@/lib/siteConfig'

export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  const baseUrl = getDynamicBaseUrl()
  const username = process.env.GITHUB_USERNAME || 'metrue'
  
  try {
    const client = createOptimizedGitHubClient(username)
    const blogPosts = await client.getBlogPosts()
    
    // Sort posts by date (newest first)
    const sortedPosts = blogPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    // Get the latest 20 posts for the feed
    const feedPosts = sortedPosts.slice(0, 20)
    
    const lastBuildDate = new Date().toISOString()
    const mostRecentPost = feedPosts[0]
    const lastUpdated = mostRecentPost ? new Date(mostRecentPost.date).toISOString() : lastBuildDate
    
    const atomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Minghe's Blog</title>
  <subtitle>Minghe's personal blog sharing travel experiences across Europe and Asia, tech insights, and daily thoughts.</subtitle>
  <link href="${baseUrl}/atom.xml" rel="self"/>
  <link href="${baseUrl}"/>
  <updated>${lastUpdated}</updated>
  <id>${baseUrl}/</id>
  <author>
    <name>Minghe</name>
    <email>noreply@minghe.me</email>
  </author>
  <generator>Next.js</generator>
${feedPosts.map(post => `
  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${baseUrl}/blog/${encodeURIComponent(post.id)}"/>
    <updated>${new Date(post.date).toISOString()}</updated>
    <id>${baseUrl}/blog/${encodeURIComponent(post.id)}</id>
    <content type="html"><![CDATA[${post.content}]]></content>
    <published>${new Date(post.date).toISOString()}</published>
  </entry>`).join('')}
</feed>`

    return new Response(atomXml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error generating Atom feed:', error)
    
    // Return minimal feed on error
    const errorFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Minghe's Blog</title>
  <subtitle>Minghe's personal blog</subtitle>
  <link href="${baseUrl}/atom.xml" rel="self"/>
  <link href="${baseUrl}"/>
  <updated>${new Date().toISOString()}</updated>
  <id>${baseUrl}/</id>
  <author>
    <name>Minghe</name>
  </author>
</feed>`

    return new Response(errorFeed, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
      },
    })
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}