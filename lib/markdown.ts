import type { ExternalDiscussion } from './types'

export interface BlogPostMetadata {
  title: string
  date: string
  discussions: ExternalDiscussion[]
  latitude?: number
  longitude?: number
  city?: string
  street?: string
  status?: 'draft' | 'published'
  publishedAt?: string
  lastModified?: string
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
  
  const titleMatch = frontmatter.match(/title:[ \t]*(.+)/)
  const dateMatch = frontmatter.match(/date:[ \t]*(.+)/)
  const latitudeMatch = frontmatter.match(/latitude:[ \t]*(.+)/)
  const longitudeMatch = frontmatter.match(/longitude:[ \t]*(.+)/)
  const cityMatch = frontmatter.match(/city:[ \t]*(.+)/)
  const streetMatch = frontmatter.match(/street:[ \t]*(.+)/)
  const statusMatch = frontmatter.match(/status:[ \t]*(.+)/)
  const publishedAtMatch = frontmatter.match(/publishedAt:[ \t]*(.+)/)
  const lastModifiedMatch = frontmatter.match(/lastModified:[ \t]*(.+)/)
  
  const latitudeStr = latitudeMatch?.[1]?.trim()
  const longitudeStr = longitudeMatch?.[1]?.trim()
  const latitudeNum = latitudeStr ? parseFloat(latitudeStr) : NaN
  const longitudeNum = longitudeStr ? parseFloat(longitudeStr) : NaN

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
    discussions: parseExternalDiscussions(frontmatter),
    ...(latitudeStr && !isNaN(latitudeNum) && { latitude: latitudeNum }),
    ...(longitudeStr && !isNaN(longitudeNum) && { longitude: longitudeNum }),
    ...(cityMatch && cityMatch[1].trim() && { city: cityMatch[1].trim() }),
    ...(streetMatch && streetMatch[1].trim() && { street: streetMatch[1].trim() }),
    ...(statusMatch && { status: statusMatch[1].trim() as 'draft' | 'published' }),
    ...(publishedAtMatch && { publishedAt: publishedAtMatch[1].trim() }),
    ...(lastModifiedMatch && { lastModified: lastModifiedMatch[1].trim() })
  }
}

/**
 * Remove frontmatter from markdown content, leaving only the body
 */
export function removeFrontmatter(content: string): string {
  const { body } = extractFrontmatter(content)
  return body
}