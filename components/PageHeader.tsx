'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useRef, useEffect, Suspense } from 'react'
import { Search } from 'lucide-react'

// Pages where search is relevant
const SEARCHABLE_PATHS = ['/', '/blog', '/memos']

function SearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [isExpanded, setIsExpanded] = useState(!!initialQ)
  const [value, setValue] = useState(initialQ)
  const inputRef = useRef<HTMLInputElement>(null)

  // If query is already set (e.g. back-nav), keep the input expanded
  useEffect(() => {
    const q = searchParams.get('q') || ''
    setValue(q)
    if (q) setIsExpanded(true)
  }, [searchParams])

  const handleIconClick = () => {
    setIsExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 200)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setValue(q)
    const params = new URLSearchParams(searchParams.toString())
    if (q) {
      params.set('q', q)
    } else {
      params.delete('q')
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleBlur = () => {
    if (!value) {
      setIsExpanded(false)
    }
  }

  // Only show search on pages where it's useful
  if (!SEARCHABLE_PATHS.includes(pathname)) return null

  return (
    <div
      className='flex items-center overflow-hidden transition-all duration-300 ease-in-out'
      style={{ width: isExpanded ? 220 : 32 }}
    >
      <button
        onClick={handleIconClick}
        className='flex-shrink-0 p-1 text-gray-500 hover:text-gray-700'
        aria-label='Search'
      >
        <Search size={20} />
      </button>
      {isExpanded && (
        <input
          ref={inputRef}
          type='text'
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder='Search...'
          className='w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white'
        />
      )}
    </div>
  )
}

export default function PageHeader() {
  return (
    <header className='sticky top-0 z-50 bg-[#f6f8fa] border-b border-gray-100'>
      <div className='max-w-3xl mx-auto px-4 h-12 flex items-center justify-end'>
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
      </div>
    </header>
  )
}
