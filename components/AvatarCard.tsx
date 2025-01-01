import { FaGithub, FaLinkedin, FaPodcast, FaTwitter } from 'react-icons/fa'

import { CardContent } from '@/components/ui/card'
import Image from 'next/image'
import Link from 'next/link'

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

export const AvatarCard = ({ name, links }: { name: string; links: Record<string, string> }) => {
  return (
    <div className='max-w-2xl mx-auto p-4'>
      <CardContent className='p-6'>
        <div className='flex flex-col items-center space-y-2'>
          <Avatar src={`https://github.com/${name}.png`} alt='Blogger Avatar' href={'/'} />
          <p className='text-sm font-medium'>{name}</p>
          <div className='grid grid-cols-3 gap-2'>
            {links['github.com'] && (
              <a
                href={links['github.com']}
                target='_blank'
                rel='noopener noreferrer'
                className='text-gray-500 hover:text-gray-700 transition-colors p-1.5 m-auto'
                title='GitHub'
              >
                <FaGithub size={16} />
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
                <FaTwitter size={16} />
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
                <FaLinkedin size={16} />
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
                <FaPodcast size={16} />
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
      </CardContent>
    </div>
  )
}
