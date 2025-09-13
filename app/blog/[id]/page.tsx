import { PostContainer } from './component'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createSmartClient } from '@/lib/smartClient'

export const revalidate = process.env.NODE_ENV === 'development' ? 0 : 60;

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const client = createSmartClient(session?.accessToken)
  const posts = await client.getBlogPosts()
  const post = posts.find((p) => p.id === decodeURIComponent(params.id))

  if (!post) {
    return <div>Post not found</div>
  }

  return <PostContainer post={post} />
}
