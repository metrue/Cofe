// Example: Vite + React Application
// File: src/components/BlogPost.tsx

import { ExternalComments } from 'external-comments-react'
import { useState, useEffect } from 'react'

interface BlogPost {
  id: string
  title: string
  content: string
  discussions: Array<{
    platform: 'v2ex' | 'reddit' | 'hackernews'
    url: string
  }>
}

interface Props {
  postId: string
}

export default function BlogPost({ postId }: Props) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPost(postId)
  }, [postId])

  const fetchPost = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Simulate API call
      const response = await fetch(`/api/posts/${id}`)
      if (!response.ok) throw new Error('Post not found')
      
      const postData: BlogPost = await response.json()
      setPost(postData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-red-800">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchPost(postId)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!post) return null

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <article className="prose prose-lg max-w-none">
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>

      {/* External comments section */}
      {post.discussions.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">External Discussions</h2>
            <span className="text-sm text-gray-500">
              {post.discussions.length} platform{post.discussions.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <ExternalComments
            discussions={post.discussions}
            className="border-t border-gray-200 pt-8"
            enableRefresh={true}
            refreshInterval={600} // 10 minutes
            fetchOptions={{
              cacheTimeout: 300,
              userAgent: 'ViteBlog/1.0 (example@blog.com)'
            }}
          />
        </section>
      )}
    </main>
  )
}

// Usage in App.tsx
export function App() {
  const [currentPostId, setCurrentPostId] = useState('post-1')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">My Blog</h1>
        </div>
      </nav>
      
      <BlogPost postId={currentPostId} />
      
      <footer className="bg-white border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-600">
          <p>Built with Vite, React, and external-comments-react</p>
        </div>
      </footer>
    </div>
  )
}