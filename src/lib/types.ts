export interface BlogPost {
    id: string
    title: string
    content: string
    imageUrl: string | null
    date: string
  }
  
  export type Memo = {
    id: string
    content: string
    timestamp: string
    image?: string
  }
