// Example: Next.js App Router with Server Components
// File: app/blog/[slug]/page.tsx

import { ExternalCommentsServer } from 'external-comments-react'
import Image from 'next/image'

interface BlogPost {
  slug: string
  title: string
  content: string
  discussions: Array<{
    platform: 'v2ex' | 'reddit' | 'hackernews'
    url: string
  }>
}

async function getBlogPost(slug: string): Promise<BlogPost> {
  // Simulate fetching blog post data
  return {
    slug,
    title: 'Understanding React Server Components',
    content: 'React Server Components are a new way to...',
    discussions: [
      {
        platform: 'hackernews',
        url: 'https://news.ycombinator.com/item?id=34567890'
      },
      {
        platform: 'reddit',
        url: 'https://reddit.com/r/programming/comments/abc123/understanding_react_server_components/'
      }
    ]
  }
}

export default async function BlogPage({ 
  params 
}: { 
  params: { slug: string } 
}) {
  const post = await getBlogPost(params.slug)

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <article className="prose prose-lg max-w-none">
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>

      {/* Server-rendered external comments */}
      <section className="mt-16">
        <ExternalCommentsServer
          discussions={post.discussions}
          className="border-t border-gray-200 pt-8"
          ImageComponent={Image}
          fetchOptions={{
            cacheTimeout: 600, // 10 minutes
            userAgent: 'MyBlog/1.0 (blog@example.com)'
          }}
        />
      </section>
    </main>
  )
}

// Metadata for SEO
export async function generateMetadata({ 
  params 
}: { 
  params: { slug: string } 
}) {
  const post = await getBlogPost(params.slug)
  
  return {
    title: post.title,
    description: `Read ${post.title} and join the discussion on Hacker News and Reddit.`
  }
}