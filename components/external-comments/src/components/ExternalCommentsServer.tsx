import React from 'react'
import { fetchAllExternalComments } from '../utils/fetch-comments'
import type { ExternalDiscussion, Comment, FetchOptions } from '../types'

interface ExternalCommentsServerProps {
  discussions?: ExternalDiscussion[]
  className?: string
  fetchOptions?: FetchOptions
  /** Custom Image component for avatar rendering (e.g., Next.js Image) */
  ImageComponent?: React.ComponentType<{
    src: string
    alt: string
    width: number
    height: number
    className?: string
  }>
}

/**
 * React Server Component for external comments
 * 
 * Benefits:
 * - Zero JavaScript bundle impact
 * - Comments render immediately with page load
 * - Better SEO (comments in initial HTML)
 * - Server-side caching with Next.js revalidation
 * 
 * Use this component when:
 * - You want maximum performance
 * - Comments don't need to refresh without page reload
 * - You're using Next.js with App Router
 */
export default async function ExternalCommentsServer({ 
  discussions = [], 
  className = '',
  fetchOptions = {},
  ImageComponent
}: ExternalCommentsServerProps) {
  if (discussions.length === 0) {
    return null
  }

  // Fetch all comments on the server
  const commentsByPlatform = await fetchAllExternalComments(discussions, fetchOptions)

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'v2ex':
        return 'V2EX'
      case 'reddit':
        return 'Reddit'  
      case 'hackernews':
        return 'Hacker News'
      default:
        return platform
    }
  }

  return (
    <div className={`mt-16 ${className}`}>
      <div className="space-y-12">
        {discussions.map((discussion) => {
          const platformComments = commentsByPlatform[discussion.platform] || []
          
          return (
            <div key={`${discussion.platform}-${discussion.url}`}>
              {/* Section divider with platform name */}
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <div className="px-4 text-sm text-gray-600">
                    <span>Discussing on </span>
                    <a
                      href={discussion.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 underline hover:no-underline"
                    >
                      {getPlatformName(discussion.platform)}
                    </a>
                  </div>
                </div>
              </div>

              {platformComments.length > 0 && (
                <div className="mt-6">
                  {platformComments.map((comment) => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      ImageComponent={ImageComponent}
                    />
                  ))}
                </div>
              )}

              {platformComments.length === 0 && (
                <div className="text-xs text-gray-500 mt-2 text-center">
                  No comments found.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CommentItem({ 
  comment, 
  depth = 0, 
  ImageComponent 
}: { 
  comment: Comment; 
  depth?: number;
  ImageComponent?: ExternalCommentsServerProps['ImageComponent']
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric'
    })
  }

  return (
    <div className={`mb-4 ${depth > 0 ? 'ml-6' : ''}`}>
      <blockquote className="border-l-2 border-gray-300 pl-5 py-2 relative">
        <div className="text-sm text-gray-500 flex items-center justify-between pl-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0 overflow-hidden">
              {comment.avatar && ImageComponent ? (
                <ImageComponent 
                  src={comment.avatar} 
                  alt={comment.author}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : comment.avatar ? (
                <img 
                  src={comment.avatar} 
                  alt={comment.author}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                comment.author.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">{comment.author}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{formatDate(comment.timestamp)}</span>
            </div>
          </div>
          {comment.votes !== undefined && (
            <span className="text-gray-400 text-xs">{comment.votes} points</span>
          )}
        </div>
        <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base relative">
          <span className="absolute -left-1 -top-1 text-gray-400 text-xl font-serif">&ldquo;</span>
          <span className="pl-3">{comment.content}</span>
          <span className="text-gray-400 text-xl font-serif">&rdquo;</span>
        </div>
      </blockquote>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.slice(0, 2).map((reply: Comment) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              depth={depth + 1} 
              ImageComponent={ImageComponent}
            />
          ))}
          {comment.replies.length > 2 && (
            <div className="text-sm text-gray-500 ml-6 mb-4">
              {comment.replies.length - 2} more replies...
            </div>
          )}
        </div>
      )}
    </div>
  )
}