'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { Memo } from '@/lib/types'
import { getUserLogin } from '@/lib/githubApi'
import { useSession } from 'next-auth/react'

interface HeaderProps {
  latestMemo?: Memo
  username?: string
  iconUrl?: string
}

const getRelativeTimeString = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const years = Math.floor(days / 365)

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  return `${hours} hour${hours > 1 ? 's' : ''} ago`
}

const Avatar = ({ src, alt, href }: { src: string; alt: string; href: string }) => (
  <Link href={href}>
    <Image
      src={src}
      alt={alt}
      width={48}
      height={48}
      className='rounded-full hover:opacity-90 transition-opacity'
    />
  </Link>
)

const UserInfo = ({
  displayName,
  latestMemo,
}: {
  displayName: string
  latestMemo: Memo | null
}) => (
  <div className='flex flex-col'>
    <span className='font-medium text-gray-900 text-xl'>{displayName}</span>
    <div className='flex items-center space-x-2'>
      <span className='text-xs text-gray-600 font-mono'>
        {latestMemo?.content
          ? latestMemo.content.length > 24
            ? `${latestMemo.content.substring(0, 24)} ...`
            : latestMemo.content
          : 'No status'}
      </span>
      <span className='text-xs text-gray-400'>•</span>
      <time className='text-xs text-gray-400' data-status-datetime=''>
        {latestMemo ? getRelativeTimeString(latestMemo.timestamp) : ''}
      </time>
      {typeof window !== 'undefined' && window.location.pathname !== '/memos' && (
        <>
          <span className='text-xs text-gray-400'>•</span>
          <Link href='/memos' className='text-xs text-gray-400 hover:text-gray-600 underline'>
            more
          </Link>
        </>
      )}
    </div>
  </div>
)

export default function Header({ username, iconUrl, latestMemo }: HeaderProps) {
  // eslint-disable-next-line
  const { data: session, status } = useSession()
  const [userLogin, setUserLogin] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('/icon.jpg')

  useEffect(() => {
    const updateAvatarUrl = async () => {
      if (username) {
        setAvatarUrl(`https://github.com/${username}.png`)
      } else if (session?.accessToken) {
        const login = await getUserLogin(session.accessToken)
        setUserLogin(login)
        setAvatarUrl(`https://github.com/${login}.png`)
      }
    }
    updateAvatarUrl()
  }, [session, username])

  useEffect(() => {
    if (iconUrl && iconUrl !== '/icon.jpg') {
      setAvatarUrl(iconUrl)
    }
  }, [iconUrl])

  const navigationPath = '/'
  const displayName = userLogin || username || 'Anonymous'

  return (
    <header className='top-0 left-0 right-0 py-6 bg-card z-10'>
      <div className='max-w-2xl mx-auto px-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Avatar src={avatarUrl} alt='Blogger Avatar' href={navigationPath} />
            {latestMemo && <UserInfo displayName={displayName} latestMemo={latestMemo} />}
          </div>
          <nav className='hidden'>
            <Link href='/blog' className='text-gray-600 hover:text-gray-900'>
              Blog
            </Link>
            <Link href='/memos' className='text-gray-600 hover:text-gray-900'>
              Memos
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
