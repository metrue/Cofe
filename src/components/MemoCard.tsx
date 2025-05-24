import 'katex/dist/katex.min.css'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { AiOutlineEllipsis } from 'react-icons/ai'
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

interface MemoCardProps {
  memo: Memo
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

// TODO fix following
export const MemoCard = ({ memo, onDelete, onEdit }: MemoCardProps) => {
  const t = useTranslations('HomePage')

  return (
    <div
      key={memo.id}
      className='relative flex flex-col justify-center p-4 rounded-lg leading-4 transition-all duration-300 ease-in-out hover:shadow-lg overflow-auto h-fit bg-white font-mono'
    >
      <div className='text-gray-800 mb-2 prose max-w-none'>
        <div>
          <small className='text-gray-500 self-end mt-2'>
            {getRelativeTimeString(memo.timestamp)}
          </small>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='text-gray-700 hover:text-black float-right bg-transparent'
              >
                <AiOutlineEllipsis className='h-5 w-5' />{' '}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onDelete(memo.id)}>{t('delete')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(memo.id)}>{t('edit')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
