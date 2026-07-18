/**
 * GitHubProvider — the GitHub runtime backend.
 *
 * Serves two cases behind one class:
 *   - `npx cofe --repo owner/name`  (read-only, or read-write with a token)
 *   - production on Vercel          (owner = GITHUB_USERNAME, session token)
 *
 * Reads use public raw.githubusercontent URLs (no rate limit, works without a
 * token). Writes use the Octokit-backed helpers, targeted at the configured
 * owner/repo — so a token can edit an arbitrary content repo, not just the
 * token owner's. Without a token the provider is read-only (writes throw).
 *
 * Server-only.
 */

import type { Octokit } from '@octokit/rest'
import type { BlogPost, Memo } from '@/lib/types'
import type { LikesDatabase } from '@/lib/likeUtils'
import type { SiteConfig } from '@/lib/siteConfig'
import { contentPaths } from '@/lib/content/paths'
import { getOctokit } from '@/lib/githubUtils'
import {
  createBlogPost as ghCreateBlogPost,
  updateBlogPost as ghUpdateBlogPost,
  deleteBlogPost as ghDeleteBlogPost,
  uploadImage as ghUploadImage,
  type RepoTarget,
} from '@/lib/githubApi'
import { PublicGitHubClient } from '@/lib/publicClient'
import { GitHubHighlightsRepo, type HighlightsRepo } from '@/lib/highlights/highlightsRepo'
import { ReadOnlyError, type AssetInput, type BlogSaveInput, type ContentProvider } from './types'

export class GitHubProvider implements ContentProvider {
  private readonly owner: string
  private readonly repo: string
  private readonly token?: string
  private readonly reader: PublicGitHubClient
  private readonly target: RepoTarget

  constructor(cfg: { owner: string; repo: string; token?: string }) {
    this.owner = cfg.owner
    this.repo = cfg.repo
    this.token = cfg.token
    this.reader = new PublicGitHubClient(cfg.owner, cfg.repo)
    this.target = { owner: cfg.owner, repo: cfg.repo }
  }

  get label(): string {
    return `github: ${this.owner}/${this.repo}${this.token ? '' : ' (read-only)'}`
  }

  canWrite(): boolean {
    return !!this.token
  }

  private requireToken(): string {
    if (!this.token) throw new ReadOnlyError()
    return this.token
  }

  private writeOctokit(): Octokit {
    return getOctokit(this.requireToken())
  }

  // --- reads (public raw URLs) ---
  getBlogPosts(opts?: { includeDrafts?: boolean }): Promise<BlogPost[]> {
    return this.reader.getBlogPosts(opts?.includeDrafts ?? false)
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const post = await this.reader.getBlogPost(`${id}.md`)
    return post ?? undefined
  }

  getMemos(): Promise<Memo[]> {
    return this.reader.getMemos()
  }

  getLinks(): Promise<Record<string, string>> {
    return this.reader.getLinks()
  }

  getLikes(): Promise<LikesDatabase> {
    return this.reader.getLikes()
  }

  async getSiteConfig(): Promise<SiteConfig | null> {
    try {
      const url = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/${contentPaths.siteConfig()}`
      const res = await fetch(url)
      if (!res.ok) return null
      return (await res.json()) as SiteConfig
    } catch {
      return null
    }
  }

  // --- blog + asset writes (delegate to the targeted GitHub helpers) ---
  async createBlogPost(input: BlogSaveInput): Promise<string> {
    const token = this.requireToken()
    await ghCreateBlogPost(input.title, input.content, token, input.discussions, input.location, input.status, this.target)
    return input.title.toLowerCase().replace(/\s+/g, '-')
  }

  async updateBlogPost(id: string, input: BlogSaveInput): Promise<string> {
    const token = this.requireToken()
    await ghUpdateBlogPost(id, input.title, input.content, token, input.discussions, input.location, input.status, this.target)
    return id
  }

  async deleteBlogPost(id: string): Promise<void> {
    await ghDeleteBlogPost(id, this.requireToken(), this.target)
  }

  async uploadAsset(file: AssetInput): Promise<string> {
    return ghUploadImage(file as unknown as File, this.requireToken(), this.target)
  }

  // --- memo + likes writes (JSON files, edited in place) ---
  async createMemo(memo: Memo): Promise<Memo> {
    const path = contentPaths.memos()
    const { data, sha } = await this.getJsonFile<Memo[]>(path)
    const memos = Array.isArray(data) ? data : []
    await this.putFile(path, JSON.stringify([memo, ...memos], null, 2), `Add memo ${memo.id}`, sha)
    return memo
  }

  async updateMemo(id: string, content: string): Promise<Memo> {
    const path = contentPaths.memos()
    const { data, sha } = await this.getJsonFile<Memo[]>(path)
    const memos = Array.isArray(data) ? data : []
    const idx = memos.findIndex((m) => m.id === id)
    if (idx === -1) throw new Error('Memo not found')
    const updated: Memo = { ...memos[idx], content }
    const next = memos.map((m, i) => (i === idx ? updated : m))
    await this.putFile(path, JSON.stringify(next, null, 2), `Update memo ${id}`, sha)
    return updated
  }

  async deleteMemo(id: string): Promise<void> {
    const path = contentPaths.memos()
    const { data, sha } = await this.getJsonFile<Memo[]>(path)
    const memos = Array.isArray(data) ? data : []
    await this.putFile(path, JSON.stringify(memos.filter((m) => m.id !== id), null, 2), `Delete memo ${id}`, sha)
  }

  async updateLikes(likes: LikesDatabase): Promise<void> {
    const path = contentPaths.likes()
    const { sha } = await this.getJsonFile<LikesDatabase>(path)
    await this.putFile(path, JSON.stringify(likes, null, 2), 'Update likes', sha)
  }

  highlights(): HighlightsRepo {
    // Unauthenticated Octokit still reads public content; writes need the token.
    return new GitHubHighlightsRepo(getOctokit(this.token as string), this.owner)
  }

  // --- private helpers ---
  private async getJsonFile<T>(path: string): Promise<{ data: T | null; sha?: string }> {
    const octokit = this.writeOctokit()
    try {
      const res = await octokit.repos.getContent({ owner: this.owner, repo: this.repo, path })
      if (Array.isArray(res.data) || !('content' in res.data)) return { data: null }
      const content = Buffer.from(res.data.content, 'base64').toString('utf-8')
      return { data: JSON.parse(content) as T, sha: res.data.sha }
    } catch (error) {
      if ((error as { status?: number })?.status === 404) return { data: null }
      throw error
    }
  }

  private async putFile(path: string, content: string, message: string, sha?: string): Promise<void> {
    const octokit = this.writeOctokit()
    await octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      ...(sha ? { sha } : {}),
    })
  }
}
