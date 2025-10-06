import { PostContainer } from './component'
import { createSmartClient } from '@/lib/smartClient'
import BlogDiscussions from '@/components/BlogDiscussions'

export const revalidate = process.env.NODE_ENV === 'development' ? 0 : 60;

export default async function Page({ params }: { params: { id: string } }) {
  // No authentication needed for viewing blog posts
  const client = createSmartClient()
  const posts = await client.getBlogPosts()
  const post = posts.find((p) => p.id === decodeURIComponent(params.id))

  if (!post) {
    return <div>Post not found</div>
  }

  const discussionsComponent = post.discussions ? <BlogDiscussions discussions={post.discussions} /> : null

  return <PostContainer post={post} discussionsComponent={discussionsComponent} />
}
