/**
 * Blog post markdown serialization — shared by the GitHub backend
 * (lib/githubApi.ts) and the local filesystem backend (lib/localClient.server.ts)
 * so a post written locally is byte-identical to one written via GitHub.
 */

import type { ExternalDiscussion } from './types'

export interface BlogLocation {
  latitude?: number
  longitude?: number
  city?: string
  street?: string
}

export interface BlogMarkdownInput {
  title: string
  date: string
  content: string
  status?: string
  location?: BlogLocation
  discussions?: ExternalDiscussion[]
}

/** Derive the blog filename slug from a title (same rule the CMS has always used). */
export function slugFromTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-')
}

/** Serialize external discussions into the front-matter block (empty string if none). */
export function formatDiscussions(discussions: ExternalDiscussion[] = []): string {
  if (!discussions.length) return ''
  const formatted = discussions
    .map((d) => `  - platform: ${d.platform}\n    url: ${d.url}`)
    .join('\n')
  return `external_discussions:\n${formatted}\n`
}

/** Build the full `---` front-matter + body markdown for a blog post. */
export function buildBlogMarkdown({
  title,
  date,
  content,
  status = 'published',
  location,
  discussions = [],
}: BlogMarkdownInput): string {
  const discussionsYaml = formatDiscussions(discussions)
  const locationYaml = location
    ? `latitude: ${location.latitude || ''}
longitude: ${location.longitude || ''}
city: ${location.city || ''}
street: ${location.street || ''}
`
    : ''
  const statusYaml = status !== 'published' ? `status: ${status}\n` : ''

  return `---
title: ${title}
date: ${date}
${statusYaml}${locationYaml}${discussionsYaml}---

${content}`
}

/** Extract the raw `date:` value from existing markdown, or undefined. */
export function extractDate(markdown: string): string | undefined {
  const m = markdown.match(/date:\s*(.+)/)
  return m ? m[1] : undefined
}

/** Extract the trimmed `status:` value from existing markdown, or undefined. */
export function extractStatus(markdown: string): string | undefined {
  const m = markdown.match(/status:\s*(.+)/)
  return m ? m[1].trim() : undefined
}
