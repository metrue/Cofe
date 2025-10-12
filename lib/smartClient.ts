import { createPublicGitHubClient } from './publicClient'
import { createGitHubAPIClient } from './client'
import type { BlogPost, Memo } from './types'
import type { LikesDatabase } from './likeUtils'

// Use any to allow flexible client interfaces with different signatures
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataClient = any

/**
 * Smart client that automatically chooses the right data source:
 * - Development: Local file system
 * - Production: GitHub API
 */
export class SmartClient {
  private localClient: DataClient | null = null
  private githubClient: DataClient | null = null
  private accessToken?: string
  
  constructor(accessToken?: string) {
    this.accessToken = accessToken
  }

  private async getLocalClient(): Promise<DataClient | null> {
    if (!this.localClient && typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const { createLocalFileSystemClient } = await import('./localClient.server')
      this.localClient = createLocalFileSystemClient()
    }
    return this.localClient
  }

  private getGitHubClient(): DataClient {
    if (!this.githubClient) {
      const username = process.env.GITHUB_USERNAME ?? ''
      if (!username) {
        throw new Error('GITHUB_USERNAME environment variable is required for production')
      }
      
      if (this.accessToken) {
        // Create API client and wrap it to always pass the correct owner
        const apiClient = createGitHubAPIClient(this.accessToken)
        this.githubClient = {
          ...apiClient,
          getBlogPosts: (includeAuthenticatedDrafts = false) => 
            apiClient.getBlogPosts(username, includeAuthenticatedDrafts),
          getBlogPost: (name: string) => 
            apiClient.getBlogPost(name, username),
          getMemos: () => 
            apiClient.getMemos(username),
          getLinks: () => 
            apiClient.getLinks(username),
          getLikes: () => 
            apiClient.getLikes(username),
          updateLikes: (likesData: LikesDatabase) => 
            apiClient.updateLikes(likesData, username),
          getDrafts: () => 
            apiClient.getDrafts(username),
          getAllBlogPosts: () => 
            apiClient.getAllBlogPosts(username)
        }
      } else {
        this.githubClient = createPublicGitHubClient(username)
      }
    }
    return this.githubClient
  }

  async getBlogPosts(): Promise<BlogPost[]> {
    const includeAuthenticatedDrafts = !!this.accessToken
    
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const client = await this.getLocalClient()
      return client ? await client.getBlogPosts(includeAuthenticatedDrafts) : []
    } else {
      const client = this.getGitHubClient()
      // Handle different signatures: GitHubAPIClient has (owner?, includeAuthenticatedDrafts)
      // PublicGitHubClient has (includeAuthenticatedDrafts)
      if (client.getBlogPosts.length > 1) {
        return await client.getBlogPosts(undefined, includeAuthenticatedDrafts)
      } else {
        return await client.getBlogPosts(includeAuthenticatedDrafts)
      }
    }
  }

  async getBlogPost(name: string): Promise<BlogPost | undefined> {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const client = await this.getLocalClient()
      if (!client?.getBlogPost) return undefined
      const result = await client.getBlogPost(name)
      return result === null ? undefined : result
    } else {
      const client = this.getGitHubClient()
      if (!client.getBlogPost) return undefined
      const result = await client.getBlogPost(name)
      return result === null ? undefined : result
    }
  }

  async getMemos(): Promise<Memo[]> {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const client = await this.getLocalClient()
      return client ? await client.getMemos() : []
    } else {
      const client = this.getGitHubClient()
      return await client.getMemos()
    }
  }

  async getLinks(): Promise<Record<string, string>> {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const client = await this.getLocalClient()
      return client ? await client.getLinks() : {}
    } else {
      const client = this.getGitHubClient()
      return await client.getLinks()
    }
  }

  async getLikes(): Promise<LikesDatabase> {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const client = await this.getLocalClient()
      return client ? await client.getLikes() : {}
    } else {
      const client = this.getGitHubClient()
      return await client.getLikes()
    }
  }

  async createMemo(memo: Memo): Promise<Memo> {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const client = await this.getLocalClient()
      if (!client?.createMemo) {
        throw new Error('Local client createMemo not available')
      }
      return await client.createMemo(memo)
    } else {
      if (!this.accessToken) {
        throw new Error('Authentication required for memo creation')
      }
      const client = this.getGitHubClient()
      
      // Get current memos
      const memos = await client.getMemos() || []
      const updatedMemos = [memo, ...memos]

      // Update memos.json via GitHub API
      const { Octokit } = await import('@octokit/rest')
      const octokit = new Octokit({ auth: this.accessToken })
      
      const { data: user } = await octokit.users.getAuthenticated()
      const owner = user.login

      try {
        const currentFile = await octokit.repos.getContent({
          owner,
          repo: 'Cofe',
          path: 'data/memos.json',
        })

        if (!Array.isArray(currentFile.data) && 'sha' in currentFile.data) {
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo: 'Cofe',
            path: 'data/memos.json',
            message: `Add new memo: ${memo.id}`,
            content: Buffer.from(JSON.stringify(updatedMemos, null, 2)).toString('base64'),
            sha: currentFile.data.sha,
          })
        }
      } catch (fileError) {
        if ((fileError as Error & { status?: number })?.status === 404) {
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo: 'Cofe',
            path: 'data/memos.json',
            message: `Create memos.json with first memo: ${memo.id}`,
            content: Buffer.from(JSON.stringify(updatedMemos, null, 2)).toString('base64'),
          })
        } else {
          throw fileError
        }
      }

      return memo
    }
  }

  async updateLikes(likesData: LikesDatabase): Promise<void> {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const client = await this.getLocalClient()
      if (!client?.updateLikes) {
        throw new Error('Local client updateLikes not available')
      }
      return await client.updateLikes(likesData)
    } else {
      if (!this.accessToken) {
        console.warn('No authentication token available for updating likes')
        return
      }
      const client = this.getGitHubClient()
      if (!client.updateLikes) {
        console.warn('GitHub client updateLikes not available')
        return
      }
      return await client.updateLikes(likesData)
    }
  }

  async getDrafts(): Promise<BlogPost[]> {
    if (!this.accessToken) {
      return []
    }
    
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const client = await this.getLocalClient()
      if (client?.getDrafts) {
        return await client.getDrafts()
      } else {
        const allPosts = await client?.getBlogPosts(true) || []
        return allPosts.filter((post: BlogPost) => post.status === 'draft')
      }
    } else {
      const client = this.getGitHubClient()
      if (client.getDrafts) {
        return await client.getDrafts()
      } else {
        let allPosts
        if (client.getBlogPosts.length > 1) {
          allPosts = await client.getBlogPosts(undefined, true)
        } else {
          allPosts = await client.getBlogPosts(true)
        }
        return allPosts.filter((post: BlogPost) => post.status === 'draft')
      }
    }
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      const client = await this.getLocalClient()
      if (client?.getAllBlogPosts) {
        return await client.getAllBlogPosts()
      } else {
        return await client?.getBlogPosts(true) || []
      }
    } else {
      const client = this.getGitHubClient()
      if (client.getAllBlogPosts) {
        return await client.getAllBlogPosts()
      } else {
        if (client.getBlogPosts.length > 1) {
          return await client.getBlogPosts(undefined, true)
        } else {
          return await client.getBlogPosts(true)
        }
      }
    }
  }
}

/**
 * Create a smart client instance
 */
export const createSmartClient = (accessToken?: string) => new SmartClient(accessToken)