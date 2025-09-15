export interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
  replies?: Comment[]
  votes?: number
  platform: string
  avatar?: string
}

export interface ExternalDiscussion {
  platform: 'v2ex' | 'reddit' | 'hackernews'
  url: string
}

export interface FetchOptions {
  /** Cache timeout in seconds (default: 300) */
  cacheTimeout?: number
  /** Custom User-Agent string */
  userAgent?: string
}