import 'katex/dist/katex.min.css'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { AiOutlineEllipsis, AiOutlineLoading3Quarters } from 'react-icons/ai'
import { Button } from '@/components/ui/button'
import { Memo } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { getRelativeTimeString } from '@/lib/utils'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTranslations } from 'next-intl'
import LikeButton from './LikeButton'

interface MemoCardProps {
  memo: Memo
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  isDeleting?: boolean
}

export const MemoCard = ({ memo, onDelete, onEdit, isDeleting = false }: MemoCardProps) => {
  const t = useTranslations('HomePage')

  return (
    <div
      key={memo.id}
      className='relative flex flex-col justify-center p-4 rounded-lg leading-4 transition-all duration-300 ease-in-out hover:shadow-lg overflow-visible h-fit bg-white font-mono'
    >
      <div className='text-gray-800 mb-2 prose max-w-none'>
        <div className='flex items-center justify-between mb-3'>
          <small className='text-gray-500 text-xs'>
            {getRelativeTimeString(memo.timestamp)}
          </small>
          <div className='flex items-center gap-2 flex-shrink-0'>
            <LikeButton type="memo" id={memo.id} className="text-xs scale-90" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  className='text-gray-600 hover:text-gray-900 bg-transparent h-6 w-6 p-0 rounded-full'
                >
                  <AiOutlineEllipsis className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="z-50">
                <DropdownMenuItem
                  onSelect={() => onDelete(memo.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                      {t('delete')}
                    </div>
                  ) : (
                    t('delete')
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(memo.id)} disabled={isDeleting}>
                  {t('edit')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({
              inline,
              className,
              children,
              ...props
            }: {
              inline?: boolean
              className?: string
              children?: React.ReactNode
            } & React.HTMLAttributes<HTMLElement>) {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (
                <SyntaxHighlighter
                  style={tomorrow as { [key: string]: React.CSSProperties }}
                  language={match[1]}
                  PreTag='div'
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            },
            a: ({ children, ...props }) => (
              <a
                {...props}
                className='text-gray-400 no-underline hover:text-gray-600 hover:underline hover:underline-offset-4 transition-colors duration-200 break-words'
                target='_blank'
                rel='noopener noreferrer'
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <div className='pl-4 border-l-4 border-gray-200 text-gray-400'>{children}</div>
            ),
          }}
        >
          {memo.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
