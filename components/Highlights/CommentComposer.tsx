'use client'

import { useState } from 'react'
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
  const [website, setWebsite] = useState('') // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className='flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3'>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        disabled={submitting || disabled}
        className='w-full resize-none rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:outline-none'
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
        onChange={(e) => setName(e.target.value)}
        placeholder='Your name (optional)'
        maxLength={40}
        disabled={submitting || disabled}
        className='w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 placeholder-gray-400 focus:border-amber-400 focus:outline-none'
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
      {error && <div className='text-xs text-red-600'>{error}</div>}
      <div className='flex items-center justify-end gap-2'>
        {onCancel && (
          <button
            type='button'
            onClick={onCancel}
            disabled={submitting}
            className='inline-flex h-7 items-center gap-1 rounded px-2 text-xs text-gray-600 hover:bg-gray-100'
          >
            <X className='h-3 w-3' />
            Cancel
          </button>
        )}
        <button
          type='button'
          onClick={handleSubmit}
          disabled={submitting || disabled || !body.trim()}
          className='inline-flex h-7 items-center gap-1 rounded bg-amber-400 px-3 text-xs font-medium text-white shadow-sm hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <Send className='h-3 w-3' />
          {submitting ? 'Sending…' : submitLabel}
        </button>
      </div>
    </div>
  )
}
