'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BlogPostContent } from '@/components/BlogPostContent'
import type { BlogPost } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { AiOutlineEllipsis } from 'react-icons/ai'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

function removeFrontmatter(content: string): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
  return content.replace(frontmatterRegex, '')
}

function decodeContent(content: string): string {
  try {
    return decodeURIComponent(content)
  } catch (error) {
    console.error('Error decoding content:', error)
    return content
  }
}

export const PostContainer = ({ post }: { post: BlogPost }) => {
  const [isDeleting ] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const router = useRouter()

  const decodedTitle = decodeContent(post.title)
  const decodedContent = decodeContent(post.content)
  const contentWithoutFrontmatter = removeFrontmatter(decodedContent)

  const handleDeleteBlogPost = async () => {
  }

  const headerContent = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <AiOutlineEllipsis className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onSelect={() => router.push(`/editor?type=blog&id=${post.id}`)}>
            {'edit'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)}>
            {'delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{'confirmDelete'}</DialogTitle>
            <DialogDescription>{'undoAction'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsDeleteDialogOpen(false)}>
              {'cancel'}
            </Button>
            <Button variant='destructive' onClick={handleDeleteBlogPost} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  return (
    <BlogPostContent
      title={decodedTitle}
      date={post.date}
      content={contentWithoutFrontmatter}
      headerContent={'authenticated' === 'authenticated' ? headerContent : null}
    />
  )
}
