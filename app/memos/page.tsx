import { AvatarCard } from '@/components/AvatarCard'
import MemosList from '@/components/MemosList'
import { createGitHubAPIClient } from '@/lib/client'

export const revalidate = 60

export default async function MemosPage() {
  const username = process.env.GITHUB_USERNAME ?? ''
  const client = createGitHubAPIClient('')
  const memos = await client.getMemos(process.env.GITHUB_USERNAME ?? '')
  const links = await client.getLinks(process.env.GITHUB_USERNAME ?? '')
  return (
    <div className='max-w-4xl mx-auto px-4 py-8'>
      <AvatarCard name={username} links={links} />

      <div className='max-w-2xl mx-auto'>
        <MemosList memos={memos} />
      </div>
    </div>
  )
}
