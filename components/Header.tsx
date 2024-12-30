'use client'

import { useEffect, useState } from 'react'

import { Memo } from '@/lib/types'
import { StatusCard } from '@/components/StatusCard'
import { getUserLogin } from '@/lib/githubApi'
import { useSession } from 'next-auth/react'

interface HeaderProps {
  latestMemo?: Memo
  username?: string
  iconUrl?: string
}

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

  const displayName = userLogin || username || 'Anonymous'

  return (
    <header className='top-0 left-0 right-0 py-6 bg-card z-10'>
      <StatusCard memo={latestMemo} name={displayName} avatar={avatarUrl} />
    </header>
  )
}
