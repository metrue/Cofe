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

export const AvatarCard = ({ name }: { name: string }) => {
  return (
    <div className='max-w-2xl mx-auto p-4'>
      <CardContent className='p-6'>
        <div className='flex flex-col items-center space-y-2'>
          <Avatar src={`https://github.com/${name}.png`} alt='Blogger Avatar' href={'/'} />
          <p className='text-sm font-medium'>{name}</p>
        </div>
      </CardContent>
    </div>
  )
}
