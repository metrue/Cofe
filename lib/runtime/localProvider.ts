/**
 * LocalProvider — the filesystem runtime backend (`npx cofe --dir <path>` and
 * `npm run dev`). Reads/writes content under the local content root, uploads
 * assets to disk, and serves highlights from the local FS repo.
 *
 * Server-only. Delegates the low-level FS work to LocalFileSystemClient /
 * saveLocalAsset / LocalFsHighlightsRepo — this class is the ContentProvider
 * façade over them.
 */

import fs from 'fs'
import path from 'path'
import type { BlogPost, Memo } from '@/lib/types'
import type { LikesDatabase } from '@/lib/likeUtils'
import type { SiteConfig } from '@/lib/siteConfig'
import { contentRel } from '@/lib/content/paths'
import { saveLocalAsset } from '@/lib/localAssets'
import { LocalFsHighlightsRepo, type HighlightsRepo } from '@/lib/highlights/highlightsRepo'
import { LocalFileSystemClient } from '@/lib/localClient.server'
import type { AssetInput, BlogSaveInput, ContentProvider } from './types'

export class LocalProvider implements ContentProvider {
  private client = new LocalFileSystemClient()

  constructor(private dir: string) {}

  get label(): string {
    return `local: ${this.dir}`
  }

  canWrite(): boolean {
    return true
  }

  // --- reads ---
  getBlogPosts(opts?: { includeDrafts?: boolean }): Promise<BlogPost[]> {
    return this.client.getBlogPosts(opts?.includeDrafts ?? false)
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const post = await this.client.getBlogPost(`${id}.md`)
    return post ?? undefined
  }

  getMemos(): Promise<Memo[]> {
    return this.client.getMemos()
  }

  getLinks(): Promise<Record<string, string>> {
    return this.client.getLinks()
  }

  getLikes(): Promise<LikesDatabase> {
    return this.client.getLikes()
  }

  async getSiteConfig(): Promise<SiteConfig | null> {
    try {
      const raw = fs.readFileSync(path.join(this.dir, contentRel.siteConfig()), 'utf-8')
      return JSON.parse(raw) as SiteConfig
    } catch {
      return null
    }
  }

  // --- writes ---
  createBlogPost(input: BlogSaveInput): Promise<string> {
    return this.client.createBlogPost(input)
  }

  updateBlogPost(id: string, input: BlogSaveInput): Promise<string> {
    return this.client.updateBlogPost(id, input)
  }

  deleteBlogPost(id: string): Promise<void> {
    return this.client.deleteBlogPost(id)
  }

  createMemo(memo: Memo): Promise<Memo> {
    return this.client.createMemo(memo)
  }

  updateMemo(id: string, content: string): Promise<Memo> {
    return this.client.updateMemo(id, content)
  }

  deleteMemo(id: string): Promise<void> {
    return this.client.deleteMemo(id)
  }

  updateLikes(data: LikesDatabase): Promise<void> {
    return this.client.updateLikes(data)
  }

  // --- assets + sub-domains ---
  uploadAsset(file: AssetInput): Promise<string> {
    return saveLocalAsset(file, {
      date: new Date().toISOString().split('T')[0],
      id: Date.now().toString(),
    })
  }

  highlights(): HighlightsRepo {
    return new LocalFsHighlightsRepo(this.dir)
  }
}
