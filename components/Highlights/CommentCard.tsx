'use client'

import { formatDistanceToNow } from 'date-fns'
import { Trash2, CheckCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { Highlight, InlineComment, Reactions as ReactionsT } from '@/lib/highlights/schema'
import { setFocused, useFocusedHighlight } from '@/lib/highlights/syncFocus'

import { CommentComposer } from './CommentComposer'
import { Reactions } from './Reactions'

interface CommentCardProps {
  highlight: Highlight
  fingerprint: string | null
  isOwner: boolean
  onReply: (
    highlightId: string,
    parentId: string | null,
    body: string,
    authorName: string | null,
  ) => Promise<void>
  onReact: (highlightId: string, commentId: string, emoji: string) => Promise<void>
  onResolve: (highlightId: string, resolved: boolean) => Promise<void>
  onDelete: (highlightId: string, commentId?: string) => Promise<void>
}

/**
 * Renders one highlight's thread as a Google Docs-style card. The thread's
 * first comment is the root; the rest render indented as replies. A reply
 * composer lives at the bottom and reveals on click.
 */
export function CommentCard(props: CommentCardProps) {
  const { highlight, fingerprint, isOwner, onReply, onReact, onResolve, onDelete } = props
  const focused = useFocusedHighlight() === highlight.id
  const [replyOpen, setReplyOpen] = useState(false)

  const root = highlight.thread[0]
  const replies = highlight.thread.slice(1)

  return (
    <div
      data-card-for={highlight.id}
      onMouseEnter={() => setFocused(highlight.id)}
      onMouseLeave={() => setFocused(null)}
      className={[
        'rounded-lg border bg-white p-3 shadow-sm transition-all',
        focused ? 'border-amber-400 shadow-md' : 'border-gray-200',
        highlight.resolved ? 'opacity-60' : '',
      ].join(' ')}
    >
      <CommentBody comment={root} fingerprint={fingerprint} isOwner={isOwner}
        onReact={(emoji) => onReact(highlight.id, root.id, emoji)}
        onDelete={() => onDelete(highlight.id, root.id)}
      />

      {replies.length > 0 && (
        <div className='mt-2 space-y-2 border-l-2 border-gray-100 pl-2'>
          {replies.map((reply) => (
            <CommentBody
              key={reply.id}
              comment={reply}
              fingerprint={fingerprint}
              isOwner={isOwner}
              onReact={(emoji) => onReact(highlight.id, reply.id, emoji)}
              onDelete={() => onDelete(highlight.id, reply.id)}
              compact
            />
          ))}
        </div>
      )}

      <div className='mt-2 flex items-center justify-between gap-2'>
        {replyOpen ? null : (
          <button
            type='button'
            onClick={() => setReplyOpen(true)}
            className='text-xs font-medium text-amber-600 hover:text-amber-700'
          >
            Reply
          </button>
        )}
        {isOwner && (
          <div className='ml-auto flex items-center gap-1'>
            <button
              type='button'
              onClick={() => onResolve(highlight.id, !highlight.resolved)}
              className='inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100'
              aria-label={highlight.resolved ? 'Reopen' : 'Resolve'}
            >
              {highlight.resolved ? <RotateCcw className='h-3 w-3' /> : <CheckCircle className='h-3 w-3' />}
              {highlight.resolved ? 'Reopen' : 'Resolve'}
            </button>
            <button
              type='button'
              onClick={() => onDelete(highlight.id)}
              className='inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50'
              aria-label='Delete highlight'
            >
              <Trash2 className='h-3 w-3' />
            </button>
          </div>
        )}
      </div>

      {replyOpen && (
        <div className='mt-2'>
          <CommentComposer
            placeholder='Reply…'
            submitLabel='Reply'
            onSubmit={async (body, name) => {
              await onReply(highlight.id, root.id, body, name)
              setReplyOpen(false)
            }}
            onCancel={() => setReplyOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

function CommentBody({
  comment,
  fingerprint,
  isOwner,
  onReact,
  onDelete,
  compact,
}: {
  comment: InlineComment
  fingerprint: string | null
  isOwner: boolean
  onReact: (emoji: string) => Promise<void>
  onDelete: () => Promise<void>
  compact?: boolean
}) {
  if (comment.hidden) {
    return <div className='text-xs italic text-gray-400'>(removed)</div>
  }

  const displayName = comment.authorName?.trim() || `Anonymous ${comment.fingerprint.slice(0, 4)}`
  const time = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })

  return (
    <div className={compact ? 'text-xs' : 'text-sm'}>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5'>
          <span className='font-medium text-gray-900'>{displayName}</span>
          <span className='text-[11px] text-gray-400'>· {time}</span>
        </div>
        {isOwner && compact && (
          <button
            type='button'
            onClick={onDelete}
            className='text-[11px] text-red-500 hover:underline'
            aria-label='Delete reply'
          >
            <Trash2 className='h-3 w-3' />
          </button>
        )}
      </div>
      <div className={['mt-1 whitespace-pre-wrap text-gray-700', compact ? '' : ''].join(' ')}>
        {comment.body}
      </div>
      <div className='mt-1.5'>
        <Reactions
          reactions={comment.reactions as ReactionsT}
          fingerprint={fingerprint}
          onToggle={(emoji) => {
            void onReact(emoji)
          }}
        />
      </div>
    </div>
  )
}
