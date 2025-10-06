import { Card, CardContent } from '@/components/ui/card'
import { FaGithub, FaLinkedin, FaPodcast, FaTwitter } from 'react-icons/fa'

import Image from 'next/image'
import Link from 'next/link'
import { Memo } from '@/lib/types'
import { getRelativeTimeString, processMemoForPreview } from '@/lib/utils'

const SocialLink = ({ href, title, icon, label, textClassName = '' }: {
  href: string
  title: string
  icon?: JSX.Element
  label: string
  textClassName?: string
}) => (
  <a
    href={href}
    target='_blank'
    rel='noopener noreferrer'
    className={`text-gray-500 hover:text-gray-700 transition-colors p-0.5 m-auto ${textClassName}`}
    title={title}
  >
    {icon || label}
    <span className='sr-only'>{label}</span>
  </a>
)

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
    <div className='max-w-3xl mx-auto px-4 pt-8 pb-4 w-full'>
      <Card className='w-full overflow-visible border border-gray-200 bg-white rounded-lg shadow-sm'>
        <CardContent className='p-8'>
          {/* Avatar and Social Links Section */}
          <div className='flex flex-col items-center space-y-3'>
            <Avatar src={avatar} alt='Blogger Avatar' href='/' />

            {/* Social Links Grid */}
            <div className='grid grid-cols-3 gap-3'>
              {links['github.com'] && (
                <SocialLink
                  href={links['github.com']}
                  title='GitHub'
                  icon={<FaGithub size={16} />}
                  label='GitHub'
                />
              )}
              {links['x.com'] && (
                <SocialLink
                  href={links['x.com']}
                  title='X'
                  icon={<FaTwitter size={16} />}
                  label='X (Twitter)'
                />
              )}
              {links['linkedin.com'] && (
                <SocialLink
                  href={links['linkedin.com']}
                  title='LinkedIn'
                  icon={<FaLinkedin size={16} />}
                  label='LinkedIn'
                />
              )}
              {links['xiaohongshu.com'] && (
                <SocialLink
                  href={links['xiaohongshu.com']}
                  title='小红书'
                  label='小红书'
                  textClassName='text-xs'
                />
              )}
              {links['podcasts.apple.com'] && (
                <SocialLink
                  href={links['podcasts.apple.com']}
                  title='Apple Podcasts'
                  icon={<FaPodcast size={16} />}
                  label='Apple Podcasts'
                />
              )}
              {links['xiaoyuzhoufm.com'] && (
                <SocialLink
                  href={links['xiaoyuzhoufm.com']}
                  title='小宇宙'
                  label='小宇宙FM'
                  textClassName='text-xs'
                />
              )}
            </div>
          </div>

          {/* Memo Content Section */}
          <div className='flex-1 min-w-0 pt-4'>
            <div className='flex justify-between items-center mb-3'>
              <time className='text-xs text-gray-400' dateTime='2023-05-26T09:12:00Z'>
                {`@${name}` + ' ' + (memo ? getRelativeTimeString(memo.timestamp) : '')}
              </time>
              <Link href='/memos' className='text-xs text-gray-400 hover:text-gray-600 underline'>
                more
              </Link>
            </div>
            {memo && (() => {
              const { processedContent, hasImages } = processMemoForPreview(memo.content);
              return (
                <div className='text-base leading-relaxed break-words'>
                  <p>{processedContent}</p>
                  {hasImages && (
                    <p className='text-xs text-gray-400 mt-2 italic'>
                      Contains images - view in &quot;more&quot; →
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
