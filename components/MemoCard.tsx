import 'katex/dist/katex.min.css'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { AiOutlineEllipsis, AiOutlineLoading3Quarters } from 'react-icons/ai'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Memo } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { formatMemoDate } from '@/lib/utils'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTranslations, useLocale } from 'next-intl'
import LikeButton from './LikeButton'
import { useTranslation } from '@/hooks/useTranslation'
import { shouldTranslate, localeToLabel } from '@/lib/translate.shared'

interface MemoCardProps {
  memo: Memo
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  isDeleting?: boolean
}

function memoLocationLabel(memo: Memo): string | null {
  // Some memos came from DailyMemo with only `street`; some from Cofe-native
  // entries have city + street; some have neither. Render whichever pieces
  // exist, deduplicated.
  const parts = [memo.city, memo.street].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0
  )
  if (parts.length === 0) return null
  // Avoid "San Francisco · San Francisco" when both fields hold the same value.
  const unique = Array.from(new Set(parts.map((p) => p.trim())))
  return unique.join(' · ')
}

export const MemoCard = ({ memo, onDelete, onEdit, isDeleting = false }: MemoCardProps) => {
  const t = useTranslations('HomePage')
  const locale = useLocale()
  const location = memoLocationLabel(memo)

  const {
    translatedText: translatedContent,
    isTranslating,
    toggleOriginal,
    showOriginal,
  } = useTranslation(memo.content, true, `memo:${memo.id}`)

  const needsTranslation = shouldTranslate(locale)

  return (
    <article
      key={memo.id}
      className='group relative flex flex-col px-5 pt-10 pb-5 rounded-xl bg-white border border-gray-200 transition-all duration-200 hover:shadow-md overflow-visible'
    >
      {/* Floating actions — absolute top-right of the card.
          Sits within the card's pt-10 padding zone (40px) so it never
          overlaps content, which starts at y=40px. */}
      <div className='absolute top-2.5 right-3 z-10'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              aria-label='More actions'
              className='text-gray-400 hover:text-gray-700 bg-transparent h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity'
            >
              <AiOutlineEllipsis className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='end'
            side='bottom'
            className='z-50 bg-white border border-gray-200 shadow-lg rounded-md min-w-[120px]'
            sideOffset={4}
          >
            <DropdownMenuItem
              onSelect={() => onDelete(memo.id)}
              disabled={isDeleting}
              className='px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 focus:bg-gray-100 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isDeleting ? (
                <div className='flex items-center gap-2'>
                  <AiOutlineLoading3Quarters className='h-4 w-4 animate-spin' />
                  {t('delete')}
                </div>
              ) : (
                t('delete')
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(memo.id)}
              disabled={isDeleting}
              className='px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 focus:bg-gray-100 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {t('edit')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content — leads the card, Instagram/Rednote-style.
          Padding stays symmetric (inherits the card's p-5). The ⋯ button is
          hover-only and the first line wraps naturally; on the rare hover
          overlap, content reads through fine because the button is small,
          translucent, and ephemeral. */}
      <div className='text-gray-900 prose prose-sm max-w-none break-words mb-4'>
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
                className='text-gray-500 no-underline hover:text-gray-800 hover:underline hover:underline-offset-4 transition-colors duration-200 break-words'
                target='_blank'
                rel='noopener noreferrer'
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <div className='pl-4 border-l-4 border-gray-200 text-gray-500 italic'>
                {children}
              </div>
            ),
            img: ({ alt, src }) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={alt ?? ''}
                src={src}
                loading='lazy'
                className='w-full h-auto rounded-lg my-3 border border-gray-100'
              />
            ),
          }}
        >
          {translatedContent}
        </ReactMarkdown>

        {/* Translation indicator */}
        {needsTranslation && (
          <div className='flex items-center gap-2 mt-2 text-xs'>
            <button
              onClick={toggleOriginal}
              className='text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors'
            >
              {showOriginal
                ? `Show in ${localeToLabel(locale)}`
                : 'Show original'}
            </button>
            {!showOriginal && (
              <span className='inline-flex items-center gap-1 text-green-400'>
                <span className='w-1.5 h-1.5 rounded-full bg-green-400' />
                Translated
              </span>
            )}
            {isTranslating && (
              <span className='text-gray-400 animate-pulse'>translating...</span>
            )}
          </div>
        )}
      </div>

      {/* Footer — date + location on the left, actions on the right */}
      <footer className='flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100'>
        <div className='flex items-center gap-2 min-w-0'>
          <time dateTime={memo.timestamp} className='whitespace-nowrap tabular-nums'>
            {formatMemoDate(memo.timestamp)}
          </time>
          {location && (
            <>
              <span aria-hidden='true' className='text-gray-300'>·</span>
              <span className='inline-flex items-center gap-1 truncate' title={location}>
                <MapPin className='h-3 w-3 flex-shrink-0' aria-hidden='true' />
                <span className='truncate'>{location}</span>
              </span>
            </>
          )}
        </div>

        <div className='flex items-center gap-1 flex-shrink-0'>
          <LikeButton type='memo' id={memo.id} className='text-xs' />
        </div>
      </footer>
    </article>
  )
}
