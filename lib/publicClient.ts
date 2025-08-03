import { BlogPost, Memo } from './types'
import { getCachedOrFetch } from './cache'
import { createGitHubAPIClient } from './client'

const REPO = 'Cofe'

const getFirstImageURLFrom = (content: string): string | null => {
  const imgRegex = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp))/i
  const match = imgRegex.exec(content)
  if (match) {
    const url = match[1]
    return url.startsWith('https://github') ? `${url}?raw=true` : url
  }
  return null
}

/**
 * Public GitHub client that uses raw.githubusercontent.com URLs
 * to avoid API rate limits for public content access
 */
export class PublicGitHubClient {
  private baseUrl: string
  private owner: string

  constructor(owner: string, repo: string = REPO) {
    this.owner = owner
    this.baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main`
  }

  /**
   * Fetch blog posts using raw GitHub URLs (no API limits)
   */
  async getBlogPosts(): Promise<BlogPost[]> {
    return getCachedOrFetch(`public:${this.owner}/${REPO}/blog`, async () => {
      try {
        // First try to get a list of blog files from a manifest or directory listing
        // Since we can't list directory contents via raw URLs, we'll try common approaches
        
        // Approach 1: Try to fetch a blog manifest file if it exists
        try {
          const manifestResponse = await fetch(`${this.baseUrl}/data/blog-manifest.json`)
          if (manifestResponse.ok) {
            const manifest = await manifestResponse.json()
            const posts = await Promise.all(
              manifest.files.map((filename: string) => this.getBlogPost(filename))
            )
            return posts.filter((post): post is BlogPost => post !== null)
          }
        } catch {
          // Manifest doesn't exist, continue to fallback
        }

        // Approach 2: Try common blog post filenames
        const commonPosts = [
          '2017-summary.md',
          'a-complex-web-app-refactor.md', 
          'a-day-of-remote-worker.md',
          'async-action-in-redux.md',
          'first-golang-project-fx.md',
          'work-going-index.md',
          '上海到阿姆斯特丹.md',
          '二月葡萄牙游记.md',
          '华为鸿蒙-harmaryos-next-线下活动小记.md',
          '四月的尾巴逛德国-柏林.md',
          '西班牙七天的旅行.md',
          '逛逛济州岛.md'
        ]

        const posts = await Promise.all(
          commonPosts.map(async (filename) => {
            try {
              return await this.getBlogPost(filename)
            } catch {
              return null
            }
          })
        )

        return posts.filter((post): post is BlogPost => post !== null)
      } catch (error) {
        console.error('Error fetching blog posts via raw URLs:', error)
        throw error
      }
    })
  }

  /**
   * Fetch a single blog post using raw GitHub URLs
   */
  async getBlogPost(filename: string): Promise<BlogPost | null> {
    const cacheKey = `public:${this.owner}/${REPO}/blog/${filename}`
    
    return getCachedOrFetch(cacheKey, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/data/blog/${filename}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            return null
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const content = await response.text()
        const titleMatch = content.match(/title:\s*(.+)/)
        const dateMatch = content.match(/date:\s*(.+)/)

        return {
          id: filename.replace('.md', ''),
          title: titleMatch
            ? decodeURIComponent(titleMatch[1].trim())
            : decodeURIComponent(filename.replace('.md', '')),
          content,
          imageUrl: getFirstImageURLFrom(content),
          date: dateMatch ? new Date(dateMatch[1].trim()).toISOString() : new Date().toISOString(),
        }
      } catch (error) {
        console.error(`Error fetching blog post ${filename}:`, error)
        return null
      }
    })
  }

  /**
   * Fetch memos using raw GitHub URLs (no API limits)
   */
  async getMemos(): Promise<Memo[]> {
    return getCachedOrFetch(`public:${this.owner}/${REPO}/memos`, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/data/memos.json`)
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('memos.json not found, returning empty array')
            return []
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const memos = await response.json()
        return Array.isArray(memos) ? memos : []
      } catch (error) {
        console.error('Error fetching memos via raw URLs:', error)
        return []
      }
    })
  }

  /**
   * Fetch links using raw GitHub URLs
   */
  async getLinks(): Promise<Record<string, string>> {
    return getCachedOrFetch(`public:${this.owner}/${REPO}/links`, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/data/site-config.json`)
        
        if (!response.ok) {
          if (response.status === 404) {
            return {}
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const config = await response.json()
        return config.links || {}
      } catch (error) {
        console.warn('Error fetching links via raw URLs:', error)
        return {}
      }
    })
  }

  /**
   * Check if the repository and basic structure exists
   */
  async checkRepositoryHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/README.md`)
      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Create a public GitHub client instance
 */
export const createPublicGitHubClient = (owner: string) => new PublicGitHubClient(owner)

/**
 * Fallback client that tries public raw URLs first, then falls back to API
 */
export class HybridGitHubClient {
  private publicClient: PublicGitHubClient
  private apiClient: ReturnType<typeof createGitHubAPIClient> | null = null

  constructor(owner: string, accessToken?: string) {
    this.publicClient = new PublicGitHubClient(owner)
    if (accessToken) {
      // Use the existing API client as fallback
      this.apiClient = createGitHubAPIClient(accessToken)
    }
  }

  async getBlogPosts(): Promise<BlogPost[]> {
    try {
      // Try public raw URLs first (no rate limits)
      return await this.publicClient.getBlogPosts()
    } catch (error) {
      console.warn('Public client failed, falling back to API:', error)
      if (this.apiClient) {
        return await this.apiClient.getBlogPosts()
      }
      throw error
    }
  }

  async getBlogPost(filename: string): Promise<BlogPost | null> {
    try {
      return await this.publicClient.getBlogPost(filename)
    } catch (error) {
      console.warn('Public client failed for blog post, falling back to API:', error)
      if (this.apiClient) {
        return (await this.apiClient.getBlogPost(filename)) || null
      }
      throw error
    }
  }

  async getMemos(): Promise<Memo[]> {
    try {
      return await this.publicClient.getMemos()
    } catch (error) {
      console.warn('Public client failed for memos, falling back to API:', error)
      if (this.apiClient) {
        return await this.apiClient.getMemos()
      }
      throw error
    }
  }

  async getLinks(): Promise<Record<string, string>> {
    try {
      return await this.publicClient.getLinks()
    } catch (error) {
      console.warn('Public client failed for links, falling back to API:', error)
      if (this.apiClient) {
        return await this.apiClient.getLinks()
      }
      throw error
    }
  }
}

export const createHybridGitHubClient = (owner: string, accessToken?: string) => 
  new HybridGitHubClient(owner, accessToken)