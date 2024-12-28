import { PostContainer } from './component'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createGitHubAPIClient } from '@/lib/client'
import fs from 'fs'
import path from 'path'

export async function generateStaticParams() {
  const blogDirectory = path.join(process.cwd(), 'data/blog')
  const filenames = fs.readdirSync(blogDirectory)

  // Generate params for each blog post based on filenames
  const params = filenames.map((filename) => ({
    id: encodeURIComponent(filename.replace(/\.md$/, '')), // Ensure non-ASCII slugs are encoded
  }))

  return params
}

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const username = process.env.GITHUB_USERNAME ?? ''
  const client = createGitHubAPIClient(session?.accessToken ?? '')
  const posts = await client.getBlogPosts(username)
  const post = posts.find((p) => p.id === decodeURIComponent(params.id))

  if (!post) {
    return <div>Post not found</div>
  }

  return <PostContainer post={post} />
}
