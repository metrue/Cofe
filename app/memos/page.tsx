import GitHubSignInButton from '@/components/GitHubSignInButton'
import MemosList from '@/components/MemosList'
import { authOptions } from '@/lib/auth'
import { createGitHubAPIClient } from '@/lib/client'
import { getServerSession } from 'next-auth/next'

export const revalidate = 60

export default async function MemosPage() {
  const session = await getServerSession(authOptions)
  const username = process.env.GITHUB_USERNAME ?? ''

  if (!session || !session.accessToken) {
    if (username) {
      const blogPosts = await createGitHubAPIClient(session?.accessToken ?? '').getMemos(
        process.env.GITHUB_USERNAME ?? ''
      )
      return (
        <div className='max-w-4xl mx-auto px-4 py-8'>
          <div className='max-w-2xl mx-auto'>
            <MemosList memos={blogPosts} />
          </div>
        </div>
      )
    } else {
      return <GitHubSignInButton />
    }
  }

  return <MemosList username={username} />
}
