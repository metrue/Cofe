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
    <div className='-ml-1 flex flex-wrap items-center gap-1'>
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
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 leading-none transition-colors',
              reacted
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            ].join(' ')}
            aria-pressed={reacted}
            aria-label={`React with ${emoji}`}
          >
            <span className='text-base'>{emoji}</span>
            {count > 0 && <span className='text-xs tabular-nums'>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
