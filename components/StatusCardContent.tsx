'use client'

import { useTranslation } from '@/hooks/useTranslation'

interface StatusCardContentProps {
  content: string
  hasImages: boolean
}

export function StatusCardContent({ content, hasImages }: StatusCardContentProps) {
  const {
    translatedText,
    isTranslating,
    toggleOriginal,
    showOriginal,
    actuallyTranslated,
  } = useTranslation(content, false, `status-memo`)

  return (
    <>
      <div className='text-base leading-relaxed break-words'>
        <p>{translatedText}</p>
        {isTranslating && (
          <span className='text-xs text-gray-400 animate-pulse'>translating...</span>
        )}
        {hasImages && (
          <p className='text-xs text-gray-400 mt-2 italic'>
            Contains images - view in &quot;more&quot; →
          </p>
        )}
      </div>
      {actuallyTranslated && (
        <div className='flex items-center gap-2 mt-1'>
          <button
            onClick={toggleOriginal}
            className='text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors'
          >
            {showOriginal ? 'Show translation' : 'Show original'}
          </button>
          {!showOriginal && (
            <span className='inline-flex items-center gap-1 text-xs text-green-400'>
              <span className='w-1.5 h-1.5 rounded-full bg-green-400' />
              Translated
            </span>
          )}
        </div>
      )}
    </>
  )
}
