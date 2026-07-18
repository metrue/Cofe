/**
 * Runtime layer — the data contract.
 *
 * A `ContentProvider` is the single interface the render layer (app/*,
 * components/*, GraphQL resolvers) depends on. Two implementations back it:
 *   - LocalProvider  — filesystem (`--dir <path>`)
 *   - GitHubProvider — raw-URL reads + Octokit writes (`--repo owner/name`, or
 *                      production from GITHUB_USERNAME + session token)
 *
 * The factory (`getProvider`) is the only place that decides which one to use;
 * nothing in the render layer imports `fs` or Octokit directly.
 */

import type { BlogPost, Memo, ExternalDiscussion } from '@/lib/types'
import type { LikesDatabase } from '@/lib/likeUtils'
import type { SiteConfig } from '@/lib/siteConfig'
import type { HighlightsRepo } from '@/lib/highlights/highlightsRepo'
import type { BlogLocation } from '@/lib/blogFrontmatter'

export interface BlogSaveInput {
  title: string
  content: string
  discussions?: ExternalDiscussion[]
  location?: BlogLocation
  status?: string
}

/** A file to upload — the shape both a web `File` and Node buffers satisfy. */
export interface AssetInput {
  name: string
  type?: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

export interface ContentProvider {
  /** Human label for logs/CLI ("local: ~/blog", "github: metrue/Cofe (read-only)"). */
  readonly label: string
  /** True when writes are possible (local always; github only with a token). */
  canWrite(): boolean

  // reads
  getBlogPosts(opts?: { includeDrafts?: boolean }): Promise<BlogPost[]>
  getBlogPost(id: string): Promise<BlogPost | undefined>
  getMemos(): Promise<Memo[]>
  getLinks(): Promise<Record<string, string>>
  getLikes(): Promise<LikesDatabase>
  getSiteConfig(): Promise<SiteConfig | null>

  // writes
  createBlogPost(input: BlogSaveInput): Promise<string>
  updateBlogPost(id: string, input: BlogSaveInput): Promise<string>
  deleteBlogPost(id: string): Promise<void>
  createMemo(memo: Memo): Promise<Memo>
  updateMemo(id: string, content: string): Promise<Memo>
  deleteMemo(id: string): Promise<void>
  updateLikes(data: LikesDatabase): Promise<void>

  // assets + sub-domains
  uploadAsset(file: AssetInput): Promise<string>
  highlights(): HighlightsRepo
}

/** Resolved runtime configuration — what the factory dispatches on. */
export type RuntimeConfig =
  | { kind: 'local'; dir: string }
  | { kind: 'github'; owner: string; repo: string; token?: string }

/** Thrown by write methods when the provider is read-only. */
export class ReadOnlyError extends Error {
  constructor(message = 'This Cofe instance is read-only. Provide a token to enable editing.') {
    super(message)
    this.name = 'ReadOnlyError'
  }
}
