/**
 * Single source of truth for Cofe's content layout in the repo.
 *
 * Every consumer (GitHub API clients, the public raw-URL reader, and the local
 * dev filesystem client) asks this module for a path instead of hardcoding a
 * `data/...` literal. That keeps the physical hierarchy in ONE place: change
 * `CONTENT_ROOT` (or a builder) here and the whole app follows.
 *
 * Contract: builders return **repo-relative POSIX paths** with no leading slash
 * (e.g. `data/blog/my-post.md`). This is the common denominator for all three
 * consumers:
 *   - GitHub API clients pass the string straight to octokit.
 *   - publicClient builds `${baseUrl}/${path}` for raw.githubusercontent.
 *   - localClient.server joins `process.cwd()` with the string for local reads.
 *
 * This module MUST stay import-safe from both client and server components:
 * no `fs`, no `path`, no `process`. Server-only filesystem joining lives in
 * localClient.server.ts.
 */

export const CONTENT_ROOT = 'data'

export const contentPaths = {
  /** Content root directory. */
  root: () => CONTENT_ROOT,
  /** Keep-file that ensures the content root exists on init. */
  rootKeep: () => `${CONTENT_ROOT}/.gitkeep`,

  /** Blog posts directory. */
  blogDir: () => `${CONTENT_ROOT}/blog`,
  /** Keep-file that ensures the blog directory exists on init. */
  blogDirKeep: () => `${CONTENT_ROOT}/blog/.gitkeep`,
  /** Blog post from a bare slug (no extension); appends exactly one `.md`. */
  blogPost: (slug: string) => `${CONTENT_ROOT}/blog/${slug}.md`,
  /** Blog post from a filename that already carries its `.md` extension. */
  blogFile: (filename: string) => `${CONTENT_ROOT}/blog/${filename}`,
  /** Derived index of blog posts. */
  blogManifest: () => `${CONTENT_ROOT}/blog-manifest.json`,

  /** Memos store. */
  memos: () => `${CONTENT_ROOT}/memos.json`,
  /** Likes store. */
  likes: () => `${CONTENT_ROOT}/likes.json`,
  /** Site configuration (runtime read/write path; see note in siteConfig.ts). */
  siteConfig: () => `${CONTENT_ROOT}/site-config.json`,

  /** Highlights directory (one JSON file per post slug). */
  highlightsDir: () => `${CONTENT_ROOT}/highlights`,
  /** Highlights file for a given post slug. */
  highlightsFile: (slug: string) => `${CONTENT_ROOT}/highlights/${slug}.json`,
} as const
