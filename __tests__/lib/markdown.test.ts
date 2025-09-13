import { 
  extractFrontmatter, 
  parseExternalDiscussions, 
  parseBlogPostMetadata,
  removeFrontmatter 
} from '../../lib/markdown'

describe('markdown parsing utilities', () => {
  describe('extractFrontmatter', () => {
    it('should extract frontmatter and body from markdown content', () => {
      const content = `---
title: Test Post
date: 2025-01-01
---

# Hello World

This is the content.`

      const result = extractFrontmatter(content)
      
      expect(result.frontmatter).toBe(`title: Test Post
date: 2025-01-01`)
      expect(result.body).toBe(`# Hello World

This is the content.`)
    })

    it('should return empty frontmatter when none exists', () => {
      const content = `# Hello World

This is the content.`

      const result = extractFrontmatter(content)
      
      expect(result.frontmatter).toBe('')
      expect(result.body).toBe(content)
    })
  })

  describe('parseExternalDiscussions', () => {
    it('should parse single external discussion', () => {
      const frontmatter = `title: Test Post
external_discussions:
  - platform: v2ex
    url: https://v2ex.com/t/123456
date: 2025-01-01`

      const result = parseExternalDiscussions(frontmatter)
      
      expect(result).toEqual([
        {
          platform: 'v2ex',
          url: 'https://v2ex.com/t/123456'
        }
      ])
    })

    it('should parse multiple external discussions', () => {
      const frontmatter = `title: Test Post
external_discussions:
  - platform: v2ex
    url: https://v2ex.com/t/123456
  - platform: reddit
    url: https://reddit.com/r/test/comments/abc123
  - platform: hackernews
    url: https://news.ycombinator.com/item?id=789
date: 2025-01-01`

      const result = parseExternalDiscussions(frontmatter)
      
      expect(result).toEqual([
        {
          platform: 'v2ex',
          url: 'https://v2ex.com/t/123456'
        },
        {
          platform: 'reddit', 
          url: 'https://reddit.com/r/test/comments/abc123'
        },
        {
          platform: 'hackernews',
          url: 'https://news.ycombinator.com/item?id=789'
        }
      ])
    })

    it('should return empty array when no external discussions', () => {
      const frontmatter = `title: Test Post
date: 2025-01-01`

      const result = parseExternalDiscussions(frontmatter)
      
      expect(result).toEqual([])
    })

    it('should ignore incomplete external discussions', () => {
      const frontmatter = `title: Test Post
external_discussions:
  - platform: v2ex
  - platform: reddit
    url: https://reddit.com/r/test/comments/abc123
  - platform: hackernews
    url: https://news.ycombinator.com/item?id=789
date: 2025-01-01`

      const result = parseExternalDiscussions(frontmatter)
      
      expect(result).toEqual([
        {
          platform: 'reddit',
          url: 'https://reddit.com/r/test/comments/abc123'
        },
        {
          platform: 'hackernews',
          url: 'https://news.ycombinator.com/item?id=789'
        }
      ])
    })
  })

  describe('parseBlogPostMetadata', () => {
    it('should parse complete blog post metadata', () => {
      const content = `---
title: My Amazing Post
date: 2025-08-14T19:34:28.147Z
external_discussions:
  - platform: v2ex
    url: https://v2ex.com/t/1158986
---

# Hello World

This is the content.`

      const result = parseBlogPostMetadata(content)
      
      expect(result).toEqual({
        title: 'My Amazing Post',
        date: '2025-08-14T19:34:28.147Z',
        discussions: [
          {
            platform: 'v2ex',
            url: 'https://v2ex.com/t/1158986'
          }
        ]
      })
    })

    it('should provide defaults for missing fields', () => {
      const content = `---
title: My Post
---

Content here.`

      const result = parseBlogPostMetadata(content)
      
      expect(result.title).toBe('My Post')
      expect(result.date).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/) // ISO date format
      expect(result.discussions).toEqual([])
    })
  })

  describe('removeFrontmatter', () => {
    it('should remove frontmatter and return only body', () => {
      const content = `---
title: Test Post
date: 2025-01-01
external_discussions:
  - platform: v2ex
    url: https://v2ex.com/t/123456
---

# Hello World

This is the content.`

      const result = removeFrontmatter(content)
      
      expect(result).toBe(`# Hello World

This is the content.`)
    })

    it('should return original content when no frontmatter', () => {
      const content = `# Hello World

This is the content.`

      const result = removeFrontmatter(content)
      
      expect(result).toBe(content)
    })
  })
})