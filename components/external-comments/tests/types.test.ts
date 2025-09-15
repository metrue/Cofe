import type { Comment, ExternalDiscussion, FetchOptions } from '../src/types'

describe('TypeScript Types', () => {
  describe('Comment interface', () => {
    it('should allow valid comment objects', () => {
      const validComment: Comment = {
        id: 'test-123',
        author: 'testuser',
        content: 'This is a test comment',
        timestamp: '2023-01-01T00:00:00.000Z',
        platform: 'hackernews'
      }

      expect(validComment).toBeDefined()
      expect(validComment.id).toBe('test-123')
      expect(validComment.author).toBe('testuser')
      expect(validComment.platform).toBe('hackernews')
    })

    it('should allow optional properties', () => {
      const commentWithOptionals: Comment = {
        id: 'test-456',
        author: 'testuser2',
        content: 'Comment with optional fields',
        timestamp: '2023-01-01T00:00:00.000Z',
        platform: 'reddit',
        votes: 42,
        avatar: 'https://example.com/avatar.jpg',
        replies: [
          {
            id: 'reply-1',
            author: 'replier',
            content: 'Reply content',
            timestamp: '2023-01-01T01:00:00.000Z',
            platform: 'reddit'
          }
        ]
      }

      expect(commentWithOptionals.votes).toBe(42)
      expect(commentWithOptionals.avatar).toBe('https://example.com/avatar.jpg')
      expect(commentWithOptionals.replies).toHaveLength(1)
    })

    it('should support nested replies', () => {
      const nestedComment: Comment = {
        id: 'parent',
        author: 'user1',
        content: 'Parent comment',
        timestamp: '2023-01-01T00:00:00.000Z',
        platform: 'v2ex',
        replies: [
          {
            id: 'child1',
            author: 'user2',
            content: 'Child comment',
            timestamp: '2023-01-01T01:00:00.000Z',
            platform: 'v2ex',
            replies: [
              {
                id: 'grandchild',
                author: 'user3',
                content: 'Grandchild comment',
                timestamp: '2023-01-01T02:00:00.000Z',
                platform: 'v2ex'
              }
            ]
          }
        ]
      }

      expect(nestedComment.replies![0].replies![0].content).toBe('Grandchild comment')
    })
  })

  describe('ExternalDiscussion interface', () => {
    it('should allow valid discussion objects for supported platforms', () => {
      const v2exDiscussion: ExternalDiscussion = {
        platform: 'v2ex',
        url: 'https://v2ex.com/t/12345'
      }

      const redditDiscussion: ExternalDiscussion = {
        platform: 'reddit',
        url: 'https://reddit.com/r/test/comments/abc123/'
      }

      const hnDiscussion: ExternalDiscussion = {
        platform: 'hackernews',
        url: 'https://news.ycombinator.com/item?id=67890'
      }

      expect(v2exDiscussion.platform).toBe('v2ex')
      expect(redditDiscussion.platform).toBe('reddit')
      expect(hnDiscussion.platform).toBe('hackernews')
    })

    // TypeScript compilation test - these should cause compile errors if uncommented
    /*
    it('should reject invalid platforms', () => {
      const invalidDiscussion: ExternalDiscussion = {
        platform: 'facebook', // This should cause a TypeScript error
        url: 'https://facebook.com/post/123'
      }
    })
    */
  })

  describe('FetchOptions interface', () => {
    it('should allow empty options object', () => {
      const emptyOptions: FetchOptions = {}
      expect(emptyOptions).toBeDefined()
    })

    it('should allow cacheTimeout option', () => {
      const withCache: FetchOptions = {
        cacheTimeout: 300
      }
      expect(withCache.cacheTimeout).toBe(300)
    })

    it('should allow userAgent option', () => {
      const withUserAgent: FetchOptions = {
        userAgent: 'Custom Bot 1.0'
      }
      expect(withUserAgent.userAgent).toBe('Custom Bot 1.0')
    })

    it('should allow both options together', () => {
      const fullOptions: FetchOptions = {
        cacheTimeout: 600,
        userAgent: 'Test Agent'
      }
      expect(fullOptions.cacheTimeout).toBe(600)
      expect(fullOptions.userAgent).toBe('Test Agent')
    })
  })

  describe('Type compatibility', () => {
    it('should work with arrays of discussions', () => {
      const discussions: ExternalDiscussion[] = [
        { platform: 'v2ex', url: 'https://v2ex.com/t/1' },
        { platform: 'reddit', url: 'https://reddit.com/r/test/comments/1/' },
        { platform: 'hackernews', url: 'https://news.ycombinator.com/item?id=1' }
      ]

      expect(discussions).toHaveLength(3)
      expect(discussions.every(d => ['v2ex', 'reddit', 'hackernews'].includes(d.platform))).toBe(true)
    })

    it('should work with comment arrays and platform mapping', () => {
      const commentsByPlatform: Record<string, Comment[]> = {
        'v2ex': [
          {
            id: 'v2ex-1',
            author: 'user1',
            content: 'V2EX comment',
            timestamp: '2023-01-01T00:00:00.000Z',
            platform: 'v2ex'
          }
        ],
        'reddit': [
          {
            id: 'reddit-1',
            author: 'user2',
            content: 'Reddit comment',
            timestamp: '2023-01-01T00:00:00.000Z',
            platform: 'reddit',
            votes: 10
          }
        ]
      }

      expect(Object.keys(commentsByPlatform)).toEqual(['v2ex', 'reddit'])
      expect(commentsByPlatform['v2ex'][0].platform).toBe('v2ex')
      expect(commentsByPlatform['reddit'][0].votes).toBe(10)
    })
  })
})