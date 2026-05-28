'use client'

import { Reactions as ReactionsT } from '@/lib/highlights/schema'

const QUICK_EMOJI = ['👍', '❤️', '🎉', '🤔', '👀'] as const

interface ReactionsProps {
  reactions: ReactionsT
  fingerprint: string | null
  onToggle: (emoji: string) => void
  disabled?: boolean
}

export function Reactions({ reactions, fingerprint, onToggle, disabled }: ReactionsProps) {
  return (
    <div className='flex flex-wrap items-center gap-1'>
      {QUICK_EMOJI.map((emoji) => {
        const fps = reactions[emoji] ?? []
        const count = fps.length
        const reacted = fingerprint != null && fps.includes(fingerprint)
        return (
          <button
            key={emoji}
            type='button'
            onClick={() => onToggle(emoji)}
            disabled={disabled}
            className={[
              'inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-[11px] transition-colors',
              reacted
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            ].join(' ')}
            aria-pressed={reacted}
            aria-label={`React with ${emoji}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
