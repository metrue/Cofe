'use client'

import { formatDistanceToNow } from 'date-fns'
import { Trash2, CheckCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { Highlight, InlineComment } from '@/lib/highlights/schema'
import { setFocused, useFocusedHighlight } from '@/lib/highlights/syncFocus'

import { CommentComposer } from './CommentComposer'

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
 *
 * NOTE: emoji reactions are intentionally hidden in the UI — the API and
 * data model still support them, but the visible bar was clashing with
 * the site's voice. Re-enable by importing/rendering `<Reactions>`.
 */
export function CommentCard(props: CommentCardProps) {
  const { highlight, fingerprint, isOwner, onReply, onReact, onResolve, onDelete } = props
  const focused = useFocusedHighlight() === highlight.id
  const [replyOpen, setReplyOpen] = useState(false)

  // `fingerprint` and `onReact` are still threaded through for when reactions
  // are re-enabled. Suppress unused warnings cleanly.
  void fingerprint
  void onReact

  const root = highlight.thread[0]
  const replies = highlight.thread.slice(1)

  return (
    <div
      data-card-for={highlight.id}
      onMouseEnter={() => setFocused(highlight.id)}
      onMouseLeave={() => setFocused(null)}
      className={[
        'rounded-lg border bg-card p-3 shadow-sm transition-all',
        focused ? 'border-primary/60 shadow-md' : 'border-border',
        highlight.resolved ? 'opacity-60' : '',
      ].join(' ')}
    >
      <CommentBody comment={root} isOwner={isOwner}
        onDelete={() => onDelete(highlight.id, root.id)}
      />

      {replies.length > 0 && (
        <div className='mt-2 space-y-2 border-l-2 border-border pl-2'>
          {replies.map((reply) => (
            <CommentBody
              key={reply.id}
              comment={reply}
              isOwner={isOwner}
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
            className='text-xs font-medium text-primary hover:underline'
          >
            Reply
          </button>
        )}
        {isOwner && (
          <button
            type='button'
            onClick={() => onResolve(highlight.id, !highlight.resolved)}
            className='ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted'
            aria-label={highlight.resolved ? 'Reopen' : 'Resolve'}
          >
            {highlight.resolved ? <RotateCcw className='h-3 w-3' /> : <CheckCircle className='h-3 w-3' />}
            {highlight.resolved ? 'Reopen' : 'Resolve'}
          </button>
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
  isOwner,
  onDelete,
  compact,
}: {
  comment: InlineComment
  isOwner: boolean
  onDelete: () => Promise<void>
  compact?: boolean
}) {
  if (comment.hidden) {
    return <div className='text-xs italic text-muted-foreground'>(removed)</div>
  }

  const displayName = comment.authorName?.trim() || `Anonymous ${comment.fingerprint.slice(0, 4)}`
  const time = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })

  return (
    <div className={compact ? 'text-xs' : 'text-sm'}>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5'>
          <span className='font-medium text-foreground'>{displayName}</span>
          <span className='text-[11px] text-muted-foreground'>· {time}</span>
        </div>
        {isOwner && (
          <button
            type='button'
            onClick={onDelete}
            className='rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive'
            aria-label={compact ? 'Delete reply' : 'Delete comment'}
          >
            <Trash2 className='h-3 w-3' />
          </button>
        )}
      </div>
      <div className='mt-1 whitespace-pre-wrap text-foreground/80'>
        {comment.body}
      </div>
    </div>
  )
}
