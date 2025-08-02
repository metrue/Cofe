import { PostContainer } from './component'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createOptimizedGitHubClient } from '@/lib/client'

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const username = process.env.GITHUB_USERNAME ?? ''
  const client = createOptimizedGitHubClient(username, session?.accessToken)
  const posts = await client.getBlogPosts()
  const post = posts.find((p) => p.id === decodeURIComponent(params.id))

  if (!post) {
    return <div>Post not found</div>
  }

  return <PostContainer post={post} />
}
