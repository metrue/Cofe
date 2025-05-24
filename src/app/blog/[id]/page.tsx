import { createGitHubAPIClient } from '@/lib/client'
import { BlogPost } from '@/lib/types'
import { PostContainer } from './component'

export async function generateStaticParams() {
  const username = process.env.GITHUB_USERNAME ?? 'metrue'
  const client = createGitHubAPIClient('')
  const posts = await client.getBlogPosts(username)
  return posts.map((post) => ({ id: post.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }>}) {
  const { id } = await params
  const username = process.env.GITHUB_USERNAME ?? 'metrue'
  const client = createGitHubAPIClient('')

  const post: BlogPost | undefined = await client.getBlogPost(`${id}.md`, username)
  if (!post) {
    return <div>Post not found</div>
  }
  return <PostContainer post={post} />
}
