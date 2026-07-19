import { AvatarCard } from '@/components/AvatarCard'
import MemosList from '@/components/MemosList'
import { getProvider } from '@/lib/runtime/provider'

export const revalidate = 60

export default async function MemosPage() {
  const username = process.env.GITHUB_USERNAME ?? ''
  const client = getProvider()
  const [memos, links] = await Promise.all([client.getMemos(), client.getLinks()])
  return (
    <div className='max-w-3xl mx-auto px-4 py-8'>
      <AvatarCard name={username} links={links} />

      <div className='max-w-2xl mx-auto'>
        <MemosList memos={memos} />
      </div>
    </div>
  )
}
