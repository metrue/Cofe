import { Card, CardContent } from '@/components/ui/card'

import Image from 'next/image'
import Link from 'next/link'
import { Memo } from '@/lib/types'
import { getRelativeTimeString } from '@/lib/utils'

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

export const StatusCard = ({
  memo,
  name,
  avatar,
}: {
  memo: Memo | undefined
  name: string
  avatar: string
}) => {
  return (
    <div className='max-w-2xl mx-auto p-4'>
      <Card className='w-full overflow-visible border border-gray-300 rounded-lg'>
        <CardContent className='p-6'>
          <div className='flex items-start space-x-4'>
            <div className='flex flex-col items-center space-y-2'>
              <Avatar src={avatar} alt='Blogger Avatar' href={'/'} />
              <p className='text-sm font-medium'>{name}</p>
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex justify-between items-center mb-2'>
                <time className='text-xs text-gray-400' dateTime='2023-05-26T09:12:00Z'>
                  {memo ? getRelativeTimeString(memo.timestamp) : ''}
                </time>
                <Link href='/memos' className='text-xs text-gray-400 hover:text-gray-600 underline'>
                  more
                </Link>
              </div>
              <p className='text-base leading-relaxed break-words'>{memo && memo.content}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
