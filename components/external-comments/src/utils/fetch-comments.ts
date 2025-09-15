import type { Comment, ExternalDiscussion, FetchOptions } from '../types'

function decodeHtmlEntities(text: string): string {
  // Server-side HTML entity decoding
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function createFetchOptions(options: FetchOptions = {}): RequestInit {
  const { userAgent = 'Mozilla/5.0 (compatible; Blog Comment Fetcher)' } = options
  
  const baseOptions: RequestInit = {
    headers: {
      'User-Agent': userAgent,
    },
  }

  // Add Next.js caching if available (runtime detection)
  if (typeof globalThis !== 'undefined' && 'process' in globalThis && process.env.NODE_ENV) {
    try {
      // Try to add Next.js cache options if we're in a Next.js environment
      return {
        ...baseOptions,
        // @ts-expect-error - Next.js specific fetch option
        next: { revalidate: options.cacheTimeout || 300 }
      }
    } catch {
      // Fallback to standard fetch if Next.js options aren't available
      return baseOptions
    }
  }
  
  return baseOptions
}

export async function fetchV2exComments(url: string, options: FetchOptions = {}): Promise<Comment[]> {
  try {
    // Extract topic ID from URL
    const topicId = url.match(/\/t\/(\d+)/)?.[1]
    if (!topicId) throw new Error('Invalid V2EX URL')

    // V2EX API endpoint
    const apiUrl = `https://www.v2ex.com/api/replies/show.json?topic_id=${topicId}`
    
    const response = await fetch(apiUrl, createFetchOptions(options))
    
    if (!response.ok) throw new Error('Failed to fetch V2EX comments')
    
    const data = await response.json()
    
    return data.map((item: {id: number; member?: {username: string; avatar_mini?: string}; content: string; created: number}) => ({
      id: `v2ex-${item.id}`,
      author: item.member?.username || 'Anonymous',
      content: item.content,
      timestamp: new Date(item.created * 1000).toISOString(),
      platform: 'v2ex',
      avatar: item.member?.avatar_mini
    }))
  } catch (error) {
    console.error('Error fetching V2EX comments:', error)
    return []
  }
}

export async function fetchRedditComments(url: string, options: FetchOptions = {}): Promise<Comment[]> {
  try {
    // Add .json to Reddit URL
    const jsonUrl = url.replace(/\/$/, '') + '.json'
    
    const response = await fetch(jsonUrl, createFetchOptions(options))
    
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

export async function fetchHackerNewsComments(url: string, options: FetchOptions = {}): Promise<Comment[]> {
  try {
    // Extract item ID from HN URL
    const itemId = url.match(/item\?id=(\d+)/)?.[1]
    if (!itemId) throw new Error('Invalid Hacker News URL')

    const apiUrl = `https://hn.algolia.com/api/v1/items/${itemId}`
    
    const response = await fetch(apiUrl, createFetchOptions(options))
    
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
              content: decodeHtmlEntities(child.text),
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

export async function fetchCommentsForPlatform(discussion: ExternalDiscussion, options: FetchOptions = {}): Promise<Comment[]> {
  switch (discussion.platform) {
    case 'v2ex':
      return fetchV2exComments(discussion.url, options)
    case 'reddit':
      return fetchRedditComments(discussion.url, options)
    case 'hackernews':
      return fetchHackerNewsComments(discussion.url, options)
    default:
      console.warn(`Unsupported platform: ${discussion.platform}`)
      return []
  }
}

export async function fetchAllExternalComments(discussions: ExternalDiscussion[], options: FetchOptions = {}): Promise<Record<string, Comment[]>> {
  const commentsByPlatform: Record<string, Comment[]> = {}
  
  // Fetch comments for all platforms in parallel
  const results = await Promise.allSettled(
    discussions.map(async (discussion) => ({
      platform: discussion.platform,
      comments: await fetchCommentsForPlatform(discussion, options)
    }))
  )
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      commentsByPlatform[result.value.platform] = result.value.comments
    } else {
      console.error(`Failed to fetch comments for ${discussions[index].platform}:`, result.reason)
      commentsByPlatform[discussions[index].platform] = []
    }
  })
  
  return commentsByPlatform
}