// Example: Custom Implementation with Direct API Usage
// Advanced usage showing custom comment handling and UI

import { 
  fetchAllExternalComments,
  fetchCommentsForPlatform,
  Comment,
  ExternalDiscussion 
} from 'external-comments-react'
import { useState, useEffect, useCallback } from 'react'

interface CustomCommentsProps {
  discussions: ExternalDiscussion[]
  maxCommentsPerPlatform?: number
  showPlatformStats?: boolean
  customFilter?: (comment: Comment) => boolean
}

export function CustomExternalComments({
  discussions,
  maxCommentsPerPlatform = 10,
  showPlatformStats = true,
  customFilter
}: CustomCommentsProps) {
  const [commentsByPlatform, setCommentsByPlatform] = useState<Record<string, Comment[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchComments = useCallback(async () => {
    setLoading(discussions.reduce((acc, d) => ({ ...acc, [d.platform]: true }), {}))
    setErrors({})

    try {
      const results = await fetchAllExternalComments(discussions, {
        cacheTimeout: 300,
        userAgent: 'CustomBlog/2.0'
      })

      // Apply custom filtering and limiting
      const filteredResults: Record<string, Comment[]> = {}
      
      Object.entries(results).forEach(([platform, comments]) => {
        let filteredComments = comments
        
        // Apply custom filter if provided
        if (customFilter) {
          filteredComments = filteredComments.filter(customFilter)
        }
        
        // Limit comments per platform
        filteredComments = filteredComments.slice(0, maxCommentsPerPlatform)
        
        filteredResults[platform] = filteredComments
      })

      setCommentsByPlatform(filteredResults)
      setLastFetch(new Date())
    } catch (error) {
      console.error('Failed to fetch external comments:', error)
      setErrors({ general: 'Failed to load comments' })
    } finally {
      setLoading({})
    }
  }, [discussions, maxCommentsPerPlatform, customFilter])

  const fetchSinglePlatform = useCallback(async (discussion: ExternalDiscussion) => {
    setLoading(prev => ({ ...prev, [discussion.platform]: true }))
    setErrors(prev => ({ ...prev, [discussion.platform]: '' }))

    try {
      const comments = await fetchCommentsForPlatform(discussion, {
        cacheTimeout: 60 // Shorter cache for manual refresh
      })

      let filteredComments = comments
      if (customFilter) {
        filteredComments = filteredComments.filter(customFilter)
      }
      filteredComments = filteredComments.slice(0, maxCommentsPerPlatform)

      setCommentsByPlatform(prev => ({
        ...prev,
        [discussion.platform]: filteredComments
      }))
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [discussion.platform]: 'Failed to refresh comments'
      }))
    } finally {
      setLoading(prev => ({ ...prev, [discussion.platform]: false }))
    }
  }, [maxCommentsPerPlatform, customFilter])

  useEffect(() => {
    if (discussions.length > 0) {
      fetchComments()
    }
  }, [fetchComments])

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'hackernews': return '🧡'
      case 'reddit': return '🔴'
      case 'v2ex': return '🟢'
      default: return '💬'
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'hackernews': return 'border-orange-200 bg-orange-50'
      case 'reddit': return 'border-red-200 bg-red-50'
      case 'v2ex': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getCommentStats = (comments: Comment[]) => {
    const totalVotes = comments.reduce((sum, comment) => sum + (comment.votes || 0), 0)
    const repliesCount = comments.reduce((sum, comment) => sum + (comment.replies?.length || 0), 0)
    return { totalVotes, repliesCount }
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className="space-y-8">
      {/* Header with refresh controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">External Discussions</h2>
          {lastFetch && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastFetch.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={fetchComments}
          disabled={Object.values(loading).some(Boolean)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {Object.values(loading).some(Boolean) ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{errors.general}</p>
        </div>
      )}

      {/* Platform sections */}
      <div className="space-y-6">
        {discussions.map((discussion) => {
          const comments = commentsByPlatform[discussion.platform] || []
          const isLoading = loading[discussion.platform]
          const error = errors[discussion.platform]
          const stats = getCommentStats(comments)

          return (
            <div
              key={`${discussion.platform}-${discussion.url}`}
              className={`border rounded-lg p-6 ${getPlatformColor(discussion.platform)}`}
            >
              {/* Platform header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getPlatformIcon(discussion.platform)}</span>
                  <div>
                    <h3 className="font-semibold capitalize">
                      {discussion.platform.replace('hackernews', 'Hacker News')}
                    </h3>
                    <a
                      href={discussion.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:underline"
                    >
                      View original discussion →
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {showPlatformStats && comments.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <span className="mr-4">{comments.length} comments</span>
                      {stats.totalVotes > 0 && (
                        <span className="mr-4">{stats.totalVotes} votes</span>
                      )}
                      {stats.repliesCount > 0 && (
                        <span>{stats.repliesCount} replies</span>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={() => fetchSinglePlatform(discussion)}
                    disabled={isLoading}
                    className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-white disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {/* Error state */}
              {error && (
                <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Comments */}
              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {comment.avatar && (
                            <img
                              src={comment.avatar}
                              alt={comment.author}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="font-medium text-gray-900">{comment.author}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-sm text-gray-500">
                            {formatTimeAgo(comment.timestamp)}
                          </span>
                        </div>
                        {comment.votes !== undefined && (
                          <span className="text-sm text-gray-600">{comment.votes} votes</span>
                        )}
                      </div>
                      
                      <div className="text-gray-800 leading-relaxed">
                        {comment.content}
                      </div>
                      
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-200">
                          <p className="text-sm text-gray-600">
                            {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {commentsByPlatform[discussion.platform]?.length === maxCommentsPerPlatform && (
                    <div className="text-center">
                      <a
                        href={discussion.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View all comments on {discussion.platform} →
                      </a>
                    </div>
                  )}
                </div>
              ) : !isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No comments found.</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Example usage with custom filtering
export function BlogPostWithCustomComments() {
  const discussions: ExternalDiscussion[] = [
    {
      platform: 'hackernews',
      url: 'https://news.ycombinator.com/item?id=34567890'
    },
    {
      platform: 'reddit',
      url: 'https://reddit.com/r/programming/comments/abc123/'
    }
  ]

  // Custom filter to only show comments with high engagement
  const highEngagementFilter = (comment: Comment) => {
    return (comment.votes || 0) >= 5 || (comment.replies?.length || 0) >= 2
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article className="prose prose-lg max-w-none mb-16">
        <h1>Understanding React Server Components</h1>
        <p>Blog content here...</p>
      </article>

      <CustomExternalComments
        discussions={discussions}
        maxCommentsPerPlatform={5}
        showPlatformStats={true}
        customFilter={highEngagementFilter}
      />
    </div>
  )
}