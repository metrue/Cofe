'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MessageCircle, ExternalLink, Loader2, AlertCircle } from 'lucide-react'

interface ExternalDiscussion {
  platform: 'v2ex' | 'reddit' | 'hackernews'
  url: string
}

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
  replies?: Comment[]
  votes?: number
  platform: string
}

interface ExternalCommentsProps {
  discussions?: ExternalDiscussion[]
  className?: string
}

export default function ExternalComments({ discussions = [], className = '' }: ExternalCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set())

  const fetchCommentsForPlatform = useCallback(async (discussion: ExternalDiscussion): Promise<Comment[]> => {
    switch (discussion.platform) {
      case 'v2ex':
        return fetchV2exComments(discussion.url)
      case 'reddit':
        return fetchRedditComments(discussion.url)
      case 'hackernews':
        return fetchHackerNewsComments(discussion.url)
      default:
        return []
    }
  }, [])

  const fetchAllComments = useCallback(async () => {
    setLoading(true)
    setError(null)
    const allComments: Comment[] = []

    for (const discussion of discussions) {
      try {
        const platformComments = await fetchCommentsForPlatform(discussion)
        allComments.push(...platformComments)
      } catch (err) {
        console.error(`Failed to fetch comments from ${discussion.platform}:`, err)
      }
    }

    setComments(allComments)
    setLoading(false)
  }, [discussions, fetchCommentsForPlatform])

  useEffect(() => {
    if (discussions.length > 0) {
      fetchAllComments()
    }
  }, [discussions, fetchAllComments])

  const fetchV2exComments = async (url: string): Promise<Comment[]> => {
    try {
      // Extract topic ID from URL
      const topicId = url.match(/\/t\/(\d+)/)?.[1]
      if (!topicId) throw new Error('Invalid V2EX URL')

      // V2EX API endpoint
      const apiUrl = `https://www.v2ex.com/api/replies/show.json?topic_id=${topicId}`
      
      // Use a CORS proxy in production
      const corsProxy = process.env.NODE_ENV === 'production' 
        ? 'https://cors-anywhere.herokuapp.com/' 
        : ''
      
      const response = await fetch(corsProxy + apiUrl)
      if (!response.ok) throw new Error('Failed to fetch V2EX comments')
      
      const data = await response.json()
      
      return data.map((item: {id: number; member?: {username: string}; content: string; created: number}) => ({
        id: `v2ex-${item.id}`,
        author: item.member?.username || 'Anonymous',
        content: item.content,
        timestamp: new Date(item.created * 1000).toISOString(),
        platform: 'v2ex'
      }))
    } catch (error) {
      console.error('Error fetching V2EX comments:', error)
      return []
    }
  }

  const fetchRedditComments = async (url: string): Promise<Comment[]> => {
    try {
      // Add .json to Reddit URL
      const jsonUrl = url.replace(/\/$/, '') + '.json'
      
      const response = await fetch(jsonUrl)
      if (!response.ok) throw new Error('Failed to fetch Reddit comments')
      
      const data = await response.json()
      const commentsData = data[1]?.data?.children || []
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parseRedditComments = (items: any[]): Comment[] => {
        return items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((item: any) => item.kind === 't1')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => ({
            id: `reddit-${item.data.id}`,
            author: item.data.author,
            content: item.data.body,
            timestamp: new Date(item.data.created_utc * 1000).toISOString(),
            votes: item.data.score,
            platform: 'reddit',
            replies: item.data.replies?.data?.children 
              ? parseRedditComments(item.data.replies.data.children)
              : []
          }))
      }
      
      return parseRedditComments(commentsData)
    } catch (error) {
      console.error('Error fetching Reddit comments:', error)
      return []
    }
  }

  const fetchHackerNewsComments = async (url: string): Promise<Comment[]> => {
    try {
      // Extract item ID from HN URL
      const itemId = url.match(/item\?id=(\d+)/)?.[1]
      if (!itemId) throw new Error('Invalid Hacker News URL')

      const apiUrl = `https://hn.algolia.com/api/v1/items/${itemId}`
      
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error('Failed to fetch HN comments')
      
      const data = await response.json()
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parseHNComments = (item: any): Comment[] => {
        const comments: Comment[] = []
        
        if (item.children) {
          for (const child of item.children) {
            if (child.text) {
              comments.push({
                id: `hn-${child.id}`,
                author: child.author || 'Anonymous',
                content: child.text,
                timestamp: child.created_at,
                votes: child.points,
                platform: 'hackernews',
                replies: parseHNComments(child)
              })
            }
          }
        }
        
        return comments
      }
      
      return parseHNComments(data)
    } catch (error) {
      console.error('Error fetching Hacker News comments:', error)
      return []
    }
  }

  const togglePlatform = (platform: string) => {
    const newExpanded = new Set(expandedPlatforms)
    if (newExpanded.has(platform)) {
      newExpanded.delete(platform)
    } else {
      newExpanded.add(platform)
    }
    setExpandedPlatforms(newExpanded)
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'v2ex':
        return '🅥'
      case 'reddit':
        return '🔶'
      case 'hackernews':
        return '🅨'
      default:
        return '💬'
    }
  }

  const groupedComments = comments.reduce((acc, comment) => {
    if (!acc[comment.platform]) {
      acc[comment.platform] = []
    }
    acc[comment.platform].push(comment)
    return acc
  }, {} as Record<string, Comment[]>)

  if (discussions.length === 0) {
    return null
  }

  return (
    <div className={`mt-8 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageCircle size={20} />
        External Discussions
      </h3>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin mr-2" size={20} />
          <span className="text-gray-500">Loading comments...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-500 mb-4">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!loading && Object.keys(groupedComments).length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedComments).map(([platform, platformComments]) => {
            const discussion = discussions.find(d => d.platform === platform)
            const isExpanded = expandedPlatforms.has(platform)
            
            return (
              <div key={platform} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => togglePlatform(platform)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getPlatformIcon(platform)}</span>
                    <span className="font-medium capitalize">{platform}</span>
                    <span className="text-sm text-gray-500">
                      ({platformComments.length} comments)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {discussion && (
                      <a
                        href={discussion.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <span className="text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {platformComments.map((comment) => (
                      <CommentItem key={comment.id} comment={comment} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && Object.keys(groupedComments).length === 0 && discussions.length > 0 && (
        <p className="text-gray-500 text-sm">No comments found from external discussions.</p>
      )}
    </div>
  )
}

function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  return (
    <div className={`${depth > 0 ? 'ml-4 pl-4 border-l-2 border-gray-200' : ''}`}>
      <div className="text-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-700">{comment.author}</span>
          <span className="text-gray-400 text-xs">{formatDate(comment.timestamp)}</span>
          {comment.votes !== undefined && (
            <span className="text-gray-500 text-xs">↑ {comment.votes}</span>
          )}
        </div>
        <div className="text-gray-600 whitespace-pre-wrap">{comment.content}</div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}