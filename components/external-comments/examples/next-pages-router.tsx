// Example: Next.js Pages Router with Client Components
// File: pages/blog/[slug].tsx

import { ExternalComments } from 'external-comments-react'
import { GetStaticProps, GetStaticPaths } from 'next'
import { useState, useEffect } from 'react'
import Head from 'next/head'

interface BlogPost {
  slug: string
  title: string
  content: string
  discussions: Array<{
    platform: 'v2ex' | 'reddit' | 'hackernews'
    url: string
  }>
}

interface Props {
  post: BlogPost
}

export default function BlogPage({ post }: Props) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <>
      <Head>
        <title>{post.title}</title>
        <meta name="description" content={`Read ${post.title} and join the discussion.`} />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="prose prose-lg max-w-none">
          <h1>{post.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>

        {/* Client-side external comments */}
        {isClient && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6">External Discussions</h2>
            <ExternalComments
              discussions={post.discussions}
              className="border-t border-gray-200 pt-8"
              enableRefresh={true}
              refreshInterval={300}
              fetchOptions={{
                cacheTimeout: 300,
                userAgent: 'MyBlog/1.0'
              }}
            />
          </section>
        )}
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Generate paths for all blog posts
  const slugs = ['understanding-rsc', 'nextjs-performance', 'react-patterns']
  
  return {
    paths: slugs.map((slug) => ({
      params: { slug }
    })),
    fallback: 'blocking'
  }
}

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = params?.slug as string
  
  // Simulate fetching blog post data
  const post: BlogPost = {
    slug,
    title: 'Understanding React Server Components',
    content: '<p>React Server Components are a new way to...</p>',
    discussions: [
      {
        platform: 'hackernews',
        url: 'https://news.ycombinator.com/item?id=34567890'
      },
      {
        platform: 'reddit',
        url: 'https://reddit.com/r/programming/comments/abc123/'
      }
    ]
  }

  return {
    props: { post },
    revalidate: 3600 // Revalidate every hour
  }
}