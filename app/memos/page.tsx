import { AvatarCard } from '@/components/AvatarCard'
import MemosList from '@/components/MemosList'
import { createSmartClient } from '@/lib/smartClient'

export const revalidate = 60

export default async function MemosPage() {
  const username = process.env.GITHUB_USERNAME ?? ''
  const client = createSmartClient()
  const memos = await client.getMemos()
  const links = await client.getLinks()
  return (
    <div className='max-w-3xl mx-auto px-4 py-8'>
      <AvatarCard name={username} links={links} />

      <div className='max-w-2xl mx-auto'>
        <MemosList memos={memos} />
      </div>
    </div>
  )
}
