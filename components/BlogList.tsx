'use client'

import { BlogCard } from './BlogCard'
import { BlogPost } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense } from 'react'

function BlogListInner({ posts }: { posts: BlogPost[] }) {
  const router = useRouter()
  const t = useTranslations('HomePage')
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  if (posts.length === 0) {
    return (
      <div className='flex flex-col items-center mt-8 space-y-4'>
        <p className='text-gray-500'>{t('noBlogPostsYet')}</p>
        <Button
          onClick={() => router.push('/editor?type=blog')}
          className='bg-black hover:bg-gray-800 text-white'
        >
          {t('createBlogPost')}
        </Button>
      </div>
    )
  }

  const sorted = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filtered = query.trim()
    ? sorted.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          (p.content || '').toLowerCase().includes(query.toLowerCase())
      )
    : sorted

  return (
    <div className='max-w-3xl mx-auto px-4 py-8'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {filtered.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
      {filtered.length === 0 && query.trim() && (
        <p className='text-center text-gray-400 mt-8'>No posts found for &quot;{query}&quot;</p>
      )}
    </div>
  )
}

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  return (
    <Suspense fallback={null}>
      <BlogListInner posts={posts} />
    </Suspense>
  )
}
