export interface ExternalDiscussion {
  platform: 'v2ex' | 'reddit' | 'hackernews'
  url: string
}

export interface BlogPost {
    id: string
    title: string
    content: string
    imageUrl: string | null
    date: string
    discussions?: ExternalDiscussion[]
    latitude?: number
    longitude?: number
    city?: string
    street?: string
  }
  
  export type Memo = {
    id: string
    content: string
    timestamp: string
    image?: string
    latitude?: number
    longitude?: number
    city?: string
    street?: string
  }

  export type Link = {
    id: string
    title: string
    url: string
    description?: string
    tags?: string[]
  }
