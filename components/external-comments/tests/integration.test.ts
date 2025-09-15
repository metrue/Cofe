import {
  fetchCommentsForPlatform,
  fetchAllExternalComments
} from '../src/utils/fetch-comments'
import type { ExternalDiscussion } from '../src/types'

describe('Integration Tests', () => {
  describe('Real API Integration (with mocks)', () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>

    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('should handle realistic V2EX API response', async () => {
      const realisticV2exResponse = [
        {
          id: 11234567,
          member: {
            username: 'realuser',
            avatar_mini: 'https://cdn.v2ex.com/avatar/1234/5678/mini.png?m=1640000000'
          },
          content: 'This is a realistic V2EX comment with Chinese characters: 这是一个测试评论',
          created: 1672531200 // 2023-01-01
        },
        {
          id: 11234568,
          member: {
            username: 'anotheruser'
          },
          content: 'Another comment without avatar',
          created: 1672531260
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => realisticV2exResponse
      } as Response)

      const discussion: ExternalDiscussion = {
        platform: 'v2ex',
        url: 'https://www.v2ex.com/t/901234'
      }

      const result = await fetchCommentsForPlatform(discussion)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'v2ex-11234567',
        author: 'realuser',
        content: expect.stringContaining('Chinese characters'),
        platform: 'v2ex',
        avatar: expect.stringContaining('cdn.v2ex.com')
      })
      expect(result[1].avatar).toBeUndefined()
    })

    it('should handle realistic Reddit API response with complex nesting', async () => {
      const realisticRedditResponse = [
        {
          kind: 'Listing',
          data: {
            children: [
              {
                kind: 't3',
                data: {
                  title: 'Original Post'
                }
              }
            ]
          }
        },
        {
          kind: 'Listing',
          data: {
            children: [
              {
                kind: 't1',
                data: {
                  id: 'h1a2b3c',
                  author: 'reddit_user_123',
                  body: 'This is a top-level comment with **markdown** formatting.',
                  created_utc: 1672531200,
                  score: 42,
                  replies: {
                    kind: 'Listing',
                    data: {
                      children: [
                        {
                          kind: 't1',
                          data: {
                            id: 'd4e5f6g',
                            author: 'reply_user',
                            body: 'This is a nested reply',
                            created_utc: 1672531800,
                            score: 5,
                            replies: ''
                          }
                        }
                      ]
                    }
                  }
                }
              },
              {
                kind: 't1',
                data: {
                  id: 'x7y8z9a',
                  author: '[deleted]',
                  body: '[deleted]',
                  created_utc: 1672532400,
                  score: -2
                }
              }
            ]
          }
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => realisticRedditResponse
      } as Response)

      const discussion: ExternalDiscussion = {
        platform: 'reddit',
        url: 'https://www.reddit.com/r/programming/comments/10abc12/interesting_post/'
      }

      const result = await fetchCommentsForPlatform(discussion)

      expect(result).toHaveLength(2)
      
      // First comment with nested reply
      expect(result[0]).toMatchObject({
        id: 'reddit-h1a2b3c',
        author: 'reddit_user_123',
        content: expect.stringContaining('markdown'),
        votes: 42,
        platform: 'reddit'
      })
      expect(result[0].replies).toHaveLength(1)
      expect(result[0].replies![0].content).toBe('This is a nested reply')

      // Deleted comment
      expect(result[1]).toMatchObject({
        author: '[deleted]',
        content: '[deleted]',
        votes: -2
      })
    })

    it('should handle realistic Hacker News API response with HTML entities', async () => {
      const realisticHNResponse = {
        id: 34567890,
        type: 'story',
        title: 'Show HN: My awesome project',
        children: [
          {
            id: 34567891,
            author: 'hacker_news_user',
            text: 'Great work! I&#x27;ve been working on something similar. Here&#x27;s my feedback:\n\n1. The API design looks clean\n2. Performance seems good\n3. Documentation could use more examples\n\nOverall rating: 8&#x2F;10',
            created_at: '2023-01-01T12:00:00.000Z',
            points: 15,
            children: [
              {
                id: 34567892,
                author: 'original_poster',
                text: 'Thanks for the feedback! I&#x27;ll definitely work on the documentation. What specific examples would you like to see?',
                created_at: '2023-01-01T12:30:00.000Z',
                points: 8
              }
            ]
          },
          {
            id: 34567893,
            author: 'critic_user',
            text: 'I disagree with the approach. The performance benchmarks don&#x27;t account for real-world usage patterns.',
            created_at: '2023-01-01T13:00:00.000Z',
            points: 2
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => realisticHNResponse
      } as Response)

      const discussion: ExternalDiscussion = {
        platform: 'hackernews',
        url: 'https://news.ycombinator.com/item?id=34567890'
      }

      const result = await fetchCommentsForPlatform(discussion)

      expect(result).toHaveLength(2)
      
      // First comment with proper HTML entity decoding
      expect(result[0]).toMatchObject({
        id: 'hn-34567891',
        author: 'hacker_news_user',
        platform: 'hackernews',
        votes: 15
      })
      expect(result[0].content).toContain("I've been working") // HTML entities decoded
      expect(result[0].content).toContain("8/10") // Fraction decoded
      expect(result[0].replies).toHaveLength(1)
      
      // Reply should also have decoded entities
      expect(result[0].replies![0].content).toContain("I'll definitely work") // Apostrophe decoded

      // Second comment
      expect(result[1]).toMatchObject({
        id: 'hn-34567893',
        author: 'critic_user',
        content: expect.stringContaining("don't account"), // Apostrophe decoded
        votes: 2
      })
    })

    it('should handle multiple platforms concurrently', async () => {
      // Mock V2EX response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 1, content: 'V2EX comment', created: 1672531200 }
        ]
      } as Response)

      // Mock Reddit response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {},
          {
            data: {
              children: [
                {
                  kind: 't1',
                  data: {
                    id: 'reddit1',
                    author: 'reddituser',
                    body: 'Reddit comment',
                    created_utc: 1672531200,
                    score: 10
                  }
                }
              ]
            }
          }
        ]
      } as Response)

      // Mock Hacker News response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          children: [
            {
              id: 123,
              author: 'hnuser',
              text: 'HN comment',
              created_at: '2023-01-01T00:00:00.000Z',
              points: 5
            }
          ]
        })
      } as Response)

      const discussions: ExternalDiscussion[] = [
        { platform: 'v2ex', url: 'https://v2ex.com/t/12345' },
        { platform: 'reddit', url: 'https://reddit.com/r/test/comments/123/' },
        { platform: 'hackernews', url: 'https://news.ycombinator.com/item?id=12345' }
      ]

      const startTime = Date.now()
      const result = await fetchAllExternalComments(discussions)
      const endTime = Date.now()

      // Should complete quickly due to parallel execution
      expect(endTime - startTime).toBeLessThan(100)

      expect(Object.keys(result)).toHaveLength(3)
      expect(result.v2ex).toHaveLength(1)
      expect(result.reddit).toHaveLength(1)
      expect(result.hackernews).toHaveLength(1)

      // Verify platform-specific properties are set correctly
      expect(result.v2ex[0].platform).toBe('v2ex')
      expect(result.reddit[0].platform).toBe('reddit')
      expect(result.hackernews[0].platform).toBe('hackernews')
    })
  })

  describe('Error Handling Integration', () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>

    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('should handle network timeouts gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      const discussion: ExternalDiscussion = {
        platform: 'v2ex',
        url: 'https://v2ex.com/t/12345'
      }

      const result = await fetchCommentsForPlatform(discussion)

      expect(result).toEqual([])
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching V2EX comments:',
        expect.any(Error)
      )
    })

    it('should handle partial failures in batch requests', async () => {
      // First request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, content: 'success', created: 1672531200 }]
      } as Response)

      // Second request fails
      mockFetch.mockRejectedValueOnce(new Error('API rate limit exceeded'))

      const discussions: ExternalDiscussion[] = [
        { platform: 'v2ex', url: 'https://v2ex.com/t/12345' },
        { platform: 'reddit', url: 'https://reddit.com/r/test/comments/123/' }
      ]

      const result = await fetchAllExternalComments(discussions)

      expect(result.v2ex).toHaveLength(1)
      expect(result.reddit).toEqual([]) // Should be empty on failure
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching Reddit comments'),
        expect.any(Error)
      )
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new SyntaxError('Invalid JSON') }
      } as Response)

      const discussion: ExternalDiscussion = {
        platform: 'hackernews',
        url: 'https://news.ycombinator.com/item?id=12345'
      }

      const result = await fetchCommentsForPlatform(discussion)

      expect(result).toEqual([])
    })
  })

  describe('Edge Cases', () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>

    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('should handle empty responses from APIs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response)

      const result = await fetchCommentsForPlatform({
        platform: 'v2ex',
        url: 'https://v2ex.com/t/12345'
      })

      expect(result).toEqual([])
    })

    it('should handle very long comment content', async () => {
      const longContent = 'A'.repeat(10000) // 10KB comment

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 1, content: longContent, created: 1672531200 }
        ]
      } as Response)

      const result = await fetchCommentsForPlatform({
        platform: 'v2ex',
        url: 'https://v2ex.com/t/12345'
      })

      expect(result[0].content).toHaveLength(10000)
      expect(result[0].content).toBe(longContent)
    })

    it('should handle special characters in URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response)

      const discussion: ExternalDiscussion = {
        platform: 'reddit',
        url: 'https://reddit.com/r/测试/comments/123/title_with_spaces_and_特殊字符/'
      }

      await fetchCommentsForPlatform(discussion)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('测试'),
        expect.any(Object)
      )
    })
  })
})