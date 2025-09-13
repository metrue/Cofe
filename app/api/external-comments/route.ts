import { NextRequest, NextResponse } from 'next/server'

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
  replies?: Comment[]
  votes?: number
  platform: string
}

function decodeHtmlEntities(text: string): string {
  // Create a temporary textarea element to decode HTML entities
  if (typeof window !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  }
  
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

async function fetchV2exComments(url: string): Promise<Comment[]> {
  try {
    // Extract topic ID from URL
    const topicId = url.match(/\/t\/(\d+)/)?.[1]
    if (!topicId) throw new Error('Invalid V2EX URL')

    // V2EX API endpoint
    const apiUrl = `https://www.v2ex.com/api/replies/show.json?topic_id=${topicId}`
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Blog Comment Fetcher)',
      },
    })
    
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

async function fetchRedditComments(url: string): Promise<Comment[]> {
  try {
    // Add .json to Reddit URL
    const jsonUrl = url.replace(/\/$/, '') + '.json'
    
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Blog Comment Fetcher)',
      },
    })
    
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

async function fetchHackerNewsComments(url: string): Promise<Comment[]> {
  try {
    // Extract item ID from HN URL
    const itemId = url.match(/item\?id=(\d+)/)?.[1]
    if (!itemId) throw new Error('Invalid Hacker News URL')

    const apiUrl = `https://hn.algolia.com/api/v1/items/${itemId}`
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Blog Comment Fetcher)',
      },
    })
    
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const url = searchParams.get('url')

    if (!platform || !url) {
      return NextResponse.json(
        { error: 'Platform and URL parameters are required' },
        { status: 400 }
      )
    }

    let comments: Comment[] = []

    switch (platform) {
      case 'v2ex':
        comments = await fetchV2exComments(url)
        break
      case 'reddit':
        comments = await fetchRedditComments(url)
        break
      case 'hackernews':
        comments = await fetchHackerNewsComments(url)
        break
      default:
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ comments }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400', // Cache for 5 minutes, serve stale up to 1 day
      },
    })
  } catch (error) {
    console.error('Error in external-comments API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}