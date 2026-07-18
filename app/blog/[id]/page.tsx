import { PostContainer } from './component'
import { createSmartClient } from '@/lib/smartClient'
import BlogDiscussions from '@/components/BlogDiscussions'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const revalidate = process.env.NODE_ENV === 'development' ? 0 : 60;

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const client = createSmartClient(session?.accessToken)
  // Fetch the single post directly instead of loading every post and .find()-ing.
  const post = await client.getBlogPost(decodeURIComponent(params.id) + '.md')

  if (!post) {
    return <div>Post not found</div>
  }

  const discussionsComponent = post.discussions ? <BlogDiscussions discussions={post.discussions} /> : null

  return <PostContainer post={post} discussionsComponent={discussionsComponent} />
}
