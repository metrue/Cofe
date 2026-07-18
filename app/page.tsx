import BlogPage from './blog/page'
import { Memo } from '@/lib/types'
import React from 'react'
import { StatusCard } from '@/components/StatusCard'
import { getProvider } from '@/lib/runtime/provider'

export default async function Home() {
  const username = process.env.GITHUB_USERNAME ?? ''

  const client = getProvider()
  const memos = await client.getMemos()
  const links = await client.getLinks()
  let latestMemo: Memo | undefined
  if (memos.length > 0) {
    latestMemo = memos.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0]
  }

  return (
    <div className='flex flex-col min-h-screen'>
      <StatusCard
        memo={latestMemo}
        name={username}
        avatar={`https://github.com/${username}.png`}
        links={links}
      />
      <main className='lex-grow w-full'>
        <BlogPage />
      </main>
    </div>
  )
}
