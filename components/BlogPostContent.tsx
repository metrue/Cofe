'use client'

import 'katex/dist/katex.min.css'


import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { format } from 'date-fns'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import Image from 'next/image'
import LikeButton from './LikeButton'
interface BlogPostContentProps {
  title: string
  date: string
  content: string
  slug: string
  headerContent?: React.ReactNode
  discussionsComponent?: React.ReactNode
  location?: {
    city?: string
    street?: string
  }
}

export function BlogPostContent({ title, date, content, slug, headerContent, discussionsComponent, location }: BlogPostContentProps) {
  return (
    <div className='max-w-3xl mx-auto px-4 py-8'>
      {headerContent && (
        <div className='flex justify-end mb-6'>
          {headerContent}
        </div>
      )}
      <main className='bg-white rounded-lg border border-gray-200 p-8'>
        <header className='mb-8'>
          <h1 className='text-3xl font-bold leading-tight mb-3 text-gray-900'>{title}</h1>
          <div className='text-sm text-gray-600 flex items-center gap-3'>
            <time dateTime={date}>
              {format(new Date(date), 'MMM d, yyyy')}
            </time>
            {location?.city && (
              <span className='flex items-center gap-1'>🖊 {location.city}{location.street ? ` · ${location.street}` : ''}</span>
            )}
          </div>
        </header>
        <div className='prose prose-lg max-w-none text-gray-900 leading-relaxed'>
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
                <blockquote className='pl-4 border-l-4 border-gray-200 text-gray-400'>
                  {children}
                </blockquote>
              ),
              p: ({ children }) => {
                // Check if this paragraph only contains an image
                const isImageOnly = React.Children.toArray(children).every(child => 
                  React.isValidElement(child) && child.type === 'img'
                )
                return isImageOnly ? <>{children}</> : <p>{children}</p>
              },
              img: ({ children, ...props }) => (
                <div className='my-8 flex justify-center'>
                  <div className='w-full'>
                    <Image
                      src={props.src || ''}
                      alt={props.alt || 'image'}
                      width={1200}
                      height={800}
                      className='h-auto w-full object-contain rounded-lg shadow-md'
                      quality={100}
                      priority
                    />
                    {children && <div className='text-center mt-3 text-sm text-gray-500 italic'>{children}</div>}
                  </div>
                </div>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        
        {/* Like button section */}
        <div className='mt-8 pt-6 border-t border-gray-100 flex justify-center'>
          <LikeButton type="blog" id={slug} />
        </div>
      </main>
      
      {/* External discussions section */}
      {discussionsComponent && (
        <div className='mt-6'>
          {discussionsComponent}
        </div>
      )}
    </div>
  )
}
