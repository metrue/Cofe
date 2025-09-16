import { PostContainer } from './component'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createSmartClient } from '@/lib/smartClient'
import BlogDiscussions from '@/components/BlogDiscussions'
import { headers } from 'next/headers'
import { getLikeInfo, createItemKey, hashIP } from '@/lib/likeUtils'
import type { LikeInfo } from '@/lib/likeUtils'

export const revalidate = process.env.NODE_ENV === 'development' ? 0 : 60;

async function getServerSideLikeInfo(postId: string): Promise<LikeInfo> {
  try {
    const session = await getServerSession(authOptions)
    const client = createSmartClient(session?.accessToken)
    const likesData = await client.getLikes()
    
    // Create a mock request to get IP and location (for server-side rendering)
    // We'll use default values since we can't get real client data on server
    const headersList = headers()
    const forwarded = headersList.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || '127.0.0.1'
    const acceptLanguage = headersList.get('accept-language') || 'en-US'
    const countryHint = acceptLanguage.includes('-') 
      ? acceptLanguage.split('-')[1]?.toUpperCase() 
      : 'US'
    
    const hashedIP = hashIP(ip)
    const itemKey = createItemKey('blog', postId)
    
    return getLikeInfo(likesData, itemKey, hashedIP, countryHint)
  } catch (error) {
    console.error('Error fetching server-side likes:', error)
    return { count: 0, countries: [], userLiked: false }
  }
}

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const client = createSmartClient(session?.accessToken)
  const posts = await client.getBlogPosts()
  const post = posts.find((p) => p.id === decodeURIComponent(params.id))

  if (!post) {
    return <div>Post not found</div>
  }

  const discussionsComponent = post.discussions ? <BlogDiscussions discussions={post.discussions} /> : null
  const likesInfo = await getServerSideLikeInfo(post.id)

  return <PostContainer post={post} discussionsComponent={discussionsComponent} initialLikes={likesInfo} />
}
