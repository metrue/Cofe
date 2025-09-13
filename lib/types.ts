export interface ExternalDiscussion {
  platform: 'v2ex' | 'reddit' | 'hackernews' | 'twitter' | 'weibo'
  url: string
}

export interface BlogPost {
    id: string
    title: string
    content: string
    imageUrl: string | null
    date: string
    externalDiscussions?: ExternalDiscussion[]
  }
  
  export type Memo = {
    id: string
    content: string
    timestamp: string
    image?: string
  }
