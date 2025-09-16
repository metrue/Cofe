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
import { DiscussionServer, type ExternalDiscussion } from 'discussing'

interface BlogPostContentServerProps {
  title: string
  date: string
  content: string
  slug: string
  headerContent?: React.ReactNode
  discussions?: ExternalDiscussion[]
}

/**
 * Server Component version of BlogPostContent
 * Uses DiscussionServer to fetch comments on the server
 * No API route needed!
 */
export async function BlogPostContentServer({ 
  title, 
  date, 
  content, 
  slug, 
  headerContent, 
  discussions 
}: BlogPostContentServerProps) {
  return (
    <div className='max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto mt-8 mb-12 px-6 sm:px-8 lg:px-12'>
      <header className='pb-8 lg:pb-12'>
        <div className='flex justify-between items-start'>
          <div>
            <h1 className='text-2xl lg:text-3xl font-normal leading-tight mb-2'>{title}</h1>
            <time className='text-xs lg:text-sm text-gray-500 font-mono' data-status-datetime=''>
              {format(new Date(date), 'MMM d, yyyy')}
            </time>
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
              code({ inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      backgroundColor: '#2d2d2d',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      lineHeight: '1.45',
                      overflowX: 'auto',
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              },
              img({ src, alt }: any) {
                if (!src) return null
                
                const isLocalImage = src.startsWith('/') || src.startsWith('.')
                const isAbsoluteImage = src.startsWith('http://') || src.startsWith('https://')
                
                if (isLocalImage || isAbsoluteImage) {
                  return (
                    <span className="block my-4">
                      <Image
                        src={src}
                        alt={alt || ''}
                        width={672}
                        height={400}
                        className="rounded-lg"
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                        }}
                        unoptimized={isAbsoluteImage}
                      />
                    </span>
                  )
                }
                
                return <img src={src} alt={alt} />
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        <div className="mt-8 pt-4 border-t border-gray-100">
          <LikeButton type="blog" id={slug} />
        </div>
        
        {/* Server Component - fetches comments on the server, no API route needed! */}
        {discussions && discussions.length > 0 && (
          <DiscussionServer
            discussions={discussions}
            className="mt-8 pt-6 border-t border-gray-100"
          />
        )}
      </main>
    </div>
  )
}