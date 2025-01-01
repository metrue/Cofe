import { Card, CardContent } from '@/components/ui/card'
import { FaGithub, FaLinkedin, FaPodcast, FaTwitter } from 'react-icons/fa'

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
  links,
}: {
  memo: Memo | undefined
  name: string
  avatar: string
  links: Record<string, string>
}) => {
  return (
    <div className='max-w-2xl mx-auto p-4'>
      <Card className='w-full overflow-visible border border-white bg-white rounded-lg'>
        <CardContent className='p-6'>
          <div className='flex items-start space-x-4'>
            <div className='flex flex-col items-center space-y-2'>
              <Avatar src={avatar} alt='Blogger Avatar' href={'/'} />
              <p className='text-sm font-medium'>{name}</p>
              <div className='grid grid-cols-3 gap-1'>
                {links['github.com'] && (
                  <a
                    href={links['github.com']}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-gray-500 hover:text-gray-700 transition-colors p-1.5 m-auto'
                    title='GitHub'
                  >
                    <FaGithub size={12} />
                    <span className='sr-only'>GitHub</span>
                  </a>
                )}

                {links['x.com'] && (
                  <a
                    href={links['x.com']}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-gray-500 hover:text-gray-700 transition-colors p-1.5 m-auto'
                    title='X'
                  >
                    <FaTwitter size={12} />
                    <span className='sr-only'>X (Twitter)</span>
                  </a>
                )}

                {links['linkedin.com'] && (
                  <a
                    href={links['linkedin.com']}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-gray-500 hover:text-gray-700 transition-colors p-1.5 m-auto'
                    title='LinkedIn'
                  >
                    <FaLinkedin size={12} />
                    <span className='sr-only'>LinkedIn</span>
                  </a>
                )}

                {links['xiaohongshu.com'] && (
                  <a
                    href={links['xiaohongshu.com']}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-gray-500 hover:text-gray-700 transition-colors p-1.5 m-auto text-xs'
                    title='小红书'
                  >
                    小红书
                    <span className='sr-only'>小红书</span>
                  </a>
                )}

                {links['podcasts.apple.com'] && (
                  <a
                    href={links['podcasts.apple.com']}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-gray-500 hover:text-gray-700 transition-colors p-1.5 m-auto'
                    title='Apple Podcasts'
                  >
                    <FaPodcast size={12} />
                    <span className='sr-only'>Apple Podcasts</span>
                  </a>
                )}

                {links['xiaoyuzhoufm.com'] && (
                  <a
                    href={links['xiaoyuzhoufm.com']}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-gray-500 hover:text-gray-700 transition-colors p-1.5 m-auto text-xs'
                    title='小宇宙'
                  >
                    小宇宙
                    <span className='sr-only'>小宇宙FM</span>
                  </a>
                )}
              </div>
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
