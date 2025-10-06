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
    <div className='max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto mt-8 mb-12 px-6 sm:px-8 lg:px-12'>
      <header className='pb-8 lg:pb-12'>
        <div className='flex justify-between items-start'>
          <div>
            <h1 className='text-2xl lg:text-3xl font-normal leading-tight mb-2'>{title}</h1>
            <div className='text-xs lg:text-sm text-gray-500 font-mono flex items-center gap-2'>
              <time data-status-datetime=''>
                {format(new Date(date), 'MMM d, yyyy')}
              </time>
              {location?.city && (
                <span>🖊 {location.city}{location.street ? ` · ${location.street}` : ''}</span>
              )}
            </div>
          </div>
          {headerContent}
        </div>
      </header>
      <main>
        <div className='prose prose-base max-w-none text-gray-900 dark:text-gray-100 leading-relaxed' 
             style={{ 
               fontFamily: 'system-ui, -apple-system, sans-serif',
               fontSize: '1.1rem',
               lineHeight: '1.62em',
               wordWrap: 'break-word'
             }}>
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
                <div className='my-8'>
                  <Image
                    src={props.src || ''}
                    alt={props.alt || 'image'}
                    width={800}
                    height={600}
                    className='h-auto max-w-full mx-auto block rounded'
                  />
                  {children && <div className='text-center mt-2 text-sm text-gray-500'>{children}</div>}
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
        
        {/* External discussions section - Server component, no API route needed! */}
        {discussionsComponent}
      </main>
    </div>
  )
}
