'use client'

import { useEffect, useState } from 'react'
import { Send, X } from 'lucide-react'

interface CommentComposerProps {
  /** Optional initial body (e.g. user has been re-prompted to retry). */
  initialBody?: string
  initialName?: string
  placeholder?: string
  submitLabel?: string
  onSubmit: (body: string, authorName: string | null) => Promise<void>
  onCancel?: () => void
  disabled?: boolean
}

/**
 * Reusable composer for both new highlights and replies. Body + optional
 * display name. Honeypot field is rendered but visually hidden — bots
 * tend to fill every form field, humans don't see it.
 */
export function CommentComposer({
  initialBody = '',
  initialName = '',
  placeholder = 'Add a comment…',
  submitLabel = 'Comment',
  onSubmit,
  onCancel,
  disabled,
}: CommentComposerProps) {
  const [body, setBody] = useState(initialBody)
  const [name, setName] = useState(initialName)
  const [nameTouched, setNameTouched] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep name field synced with `initialName` while the user hasn't typed
  // their own — this matters when a logged-in user's display name arrives
  // asynchronously (after the composer has already mounted).
  useEffect(() => {
    if (!nameTouched) {
      setName(initialName)
    }
  }, [initialName, nameTouched])

  async function handleSubmit() {
    if (!body.trim() || submitting || disabled) return
    setSubmitting(true)
    setError(null)
    try {
      // Honeypot: server already rejects, but skip the call client-side.
      if (website.length > 0) {
        setError('Submission blocked')
        return
      }
      await onSubmit(body.trim(), name.trim() ? name.trim() : null)
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='flex flex-col gap-3 rounded-lg border border-border bg-card p-4'>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        disabled={submitting || disabled}
        className='w-full resize-none rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40'
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSubmit()
          }
        }}
      />
      <input
        type='text'
        value={name}
        onChange={(e) => {
          setNameTouched(true)
          setName(e.target.value)
        }}
        placeholder='Your name (optional)'
        maxLength={40}
        disabled={submitting || disabled}
        className='w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40'
      />
      {/* Honeypot — visually hidden, never tabbable. */}
      <input
        type='text'
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete='off'
        aria-hidden='true'
        className='absolute -left-[9999px] -top-[9999px] h-0 w-0 opacity-0'
      />
      {error && <div className='text-xs text-destructive'>{error}</div>}
      <div className='flex items-center justify-end gap-2 pt-1'>
        {onCancel && (
          <button
            type='button'
            onClick={onCancel}
            disabled={submitting}
            className='inline-flex h-8 items-center gap-1 rounded px-3 text-xs text-muted-foreground hover:bg-muted'
          >
            <X className='h-3 w-3' />
            Cancel
          </button>
        )}
        <button
          type='button'
          onClick={handleSubmit}
          disabled={submitting || disabled || !body.trim()}
          className='inline-flex h-8 items-center gap-1 rounded bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <Send className='h-3 w-3' />
          {submitting ? 'Sending…' : submitLabel}
        </button>
      </div>
    </div>
  )
}
