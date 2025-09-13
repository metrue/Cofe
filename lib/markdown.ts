import type { ExternalDiscussion } from './types'

export interface BlogPostMetadata {
  title: string
  date: string
  discussions: ExternalDiscussion[]
}

/**
 * Extract frontmatter from markdown content
 */
export function extractFrontmatter(content: string): { frontmatter: string; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!frontmatterMatch) {
    return { frontmatter: '', body: content }
  }
  return {
    frontmatter: frontmatterMatch[1],
    body: frontmatterMatch[2].replace(/^\n/, '') // Remove leading newline from body
  }
}

/**
 * Parse external discussions from frontmatter YAML-style content
 */
export function parseExternalDiscussions(frontmatter: string): ExternalDiscussion[] {
  const discussions: ExternalDiscussion[] = []
  const discussionsMatch = frontmatter.match(/external_discussions:\s*\n([\s\S]*?)(?=\n\w|$)/)
  
  if (!discussionsMatch) {
    return discussions
  }

  const discussionsText = discussionsMatch[1]
  const discussionLines = discussionsText.split('\n').filter(line => line.trim())
  
  let currentDiscussion: Partial<ExternalDiscussion> = {}
  
  for (const line of discussionLines) {
    if (line.includes('platform:')) {
      // Save previous discussion if complete
      if (currentDiscussion.platform && currentDiscussion.url) {
        discussions.push(currentDiscussion as ExternalDiscussion)
      }
      // Start new discussion
      currentDiscussion = { 
        platform: line.split(':')[1].trim() as ExternalDiscussion['platform'] 
      }
    } else if (line.includes('url:')) {
      // Only add URL if we have a current platform context
      if (currentDiscussion.platform) {
        currentDiscussion.url = line.split('url:')[1].trim()
      }
    }
  }
  
  // Save final discussion if complete
  if (currentDiscussion.platform && currentDiscussion.url) {
    discussions.push(currentDiscussion as ExternalDiscussion)
  }
  
  return discussions
}

/**
 * Parse blog post metadata from markdown content
 */
export function parseBlogPostMetadata(content: string): BlogPostMetadata {
  const { frontmatter } = extractFrontmatter(content)
  
  const titleMatch = frontmatter.match(/title:\s*(.+)/)
  const dateMatch = frontmatter.match(/date:\s*(.+)/)
  
  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
    discussions: parseExternalDiscussions(frontmatter)
  }
}

/**
 * Remove frontmatter from markdown content, leaving only the body
 */
export function removeFrontmatter(content: string): string {
  const { body } = extractFrontmatter(content)
  return body
}