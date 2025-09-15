import {
  fetchV2exComments,
  fetchRedditComments,
  fetchHackerNewsComments,
  fetchCommentsForPlatform,
  fetchAllExternalComments
} from '../../src/utils/fetch-comments'
import type { ExternalDiscussion, Comment } from '../../src/types'

// Mock fetch
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('fetchV2exComments', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should extract topic ID from V2EX URL and fetch comments', async () => {
    const mockResponse = [
      {
        id: 123,
        member: { username: 'testuser', avatar_mini: 'https://example.com/avatar.jpg' },
        content: 'Test comment',
        created: 1234567890
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await fetchV2exComments('https://v2ex.com/t/12345')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.v2ex.com/api/replies/show.json?topic_id=12345',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'Mozilla/5.0 (compatible; Blog Comment Fetcher)'
        })
      })
    )

    expect(result).toEqual([
      {
        id: 'v2ex-123',
        author: 'testuser',
        content: 'Test comment',
        timestamp: '2009-02-13T23:31:30.000Z',
        platform: 'v2ex',
        avatar: 'https://example.com/avatar.jpg'
      }
    ])
  })

  it('should handle invalid V2EX URL', async () => {
    const result = await fetchV2exComments('https://invalid-url.com')
    expect(result).toEqual([])
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching V2EX comments:',
      expect.any(Error)
    )
  })

  it('should handle API failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    } as Response)

    const result = await fetchV2exComments('https://v2ex.com/t/12345')
    expect(result).toEqual([])
  })

  it('should handle missing member data', async () => {
    const mockResponse = [
      {
        id: 123,
        content: 'Test comment',
        created: 1234567890
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await fetchV2exComments('https://v2ex.com/t/12345')

    expect(result[0]).toEqual(
      expect.objectContaining({
        author: 'Anonymous',
        avatar: undefined
      })
    )
  })
})

describe('fetchRedditComments', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should fetch and parse Reddit comments with nested replies', async () => {
    const mockResponse = [
      {},
      {
        data: {
          children: [
            {
              kind: 't1',
              data: {
                id: 'abc123',
                author: 'reddituser',
                body: 'Reddit comment',
                created_utc: 1234567890,
                score: 42,
                replies: {
                  data: {
                    children: [
                      {
                        kind: 't1',
                        data: {
                          id: 'def456',
                          author: 'replier',
                          body: 'Reply comment',
                          created_utc: 1234567900,
                          score: 5
                        }
                      }
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await fetchRedditComments('https://reddit.com/r/test/comments/123/')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://reddit.com/r/test/comments/123.json',
      expect.any(Object)
    )

    expect(result).toEqual([
      {
        id: 'reddit-abc123',
        author: 'reddituser',
        content: 'Reddit comment',
        timestamp: '2009-02-13T23:31:30.000Z',
        votes: 42,
        platform: 'reddit',
        replies: [
          {
            id: 'reddit-def456',
            author: 'replier',
            content: 'Reply comment',
            timestamp: '2009-02-13T23:31:40.000Z',
            votes: 5,
            platform: 'reddit',
            replies: []
          }
        ]
      }
    ])
  })

  it('should handle malformed Reddit response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{}] // Missing comments data
    } as Response)

    const result = await fetchRedditComments('https://reddit.com/r/test/comments/123/')
    expect(result).toEqual([])
  })

  it('should filter out non-comment items', async () => {
    const mockResponse = [
      {},
      {
        data: {
          children: [
            { kind: 't3' }, // Post, not comment
            {
              kind: 't1',
              data: {
                id: 'abc123',
                author: 'reddituser',
                body: 'Valid comment',
                created_utc: 1234567890,
                score: 42
              }
            }
          ]
        }
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await fetchRedditComments('https://reddit.com/r/test/comments/123/')
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('Valid comment')
  })
})

describe('fetchHackerNewsComments', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should extract item ID from HN URL and fetch comments', async () => {
    const mockResponse = {
      children: [
        {
          id: 123,
          author: 'hnuser',
          text: 'HN comment with &quot;HTML entities&quot;',
          created_at: '2009-02-13T23:31:30.000Z',
          points: 15,
          children: [
            {
              id: 124,
              author: 'replier',
              text: 'Reply to comment',
              created_at: '2009-02-13T23:32:00.000Z',
              points: 5
            }
          ]
        }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await fetchHackerNewsComments('https://news.ycombinator.com/item?id=12345')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hn.algolia.com/api/v1/items/12345',
      expect.any(Object)
    )

    expect(result).toEqual([
      {
        id: 'hn-123',
        author: 'hnuser',
        content: 'HN comment with "HTML entities"',
        timestamp: '2009-02-13T23:31:30.000Z',
        votes: 15,
        platform: 'hackernews',
        replies: [
          {
            id: 'hn-124',
            author: 'replier',
            content: 'Reply to comment',
            timestamp: '2009-02-13T23:32:00.000Z',
            votes: 5,
            platform: 'hackernews',
            replies: []
          }
        ]
      }
    ])
  })

  it('should handle invalid HN URL', async () => {
    const result = await fetchHackerNewsComments('https://invalid-url.com')
    expect(result).toEqual([])
  })

  it('should skip comments without text', async () => {
    const mockResponse = {
      children: [
        { id: 123, author: 'user1' }, // No text
        { id: 124, author: 'user2', text: 'Valid comment' }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await fetchHackerNewsComments('https://news.ycombinator.com/item?id=12345')
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('Valid comment')
  })

  it('should handle missing author gracefully', async () => {
    const mockResponse = {
      children: [
        {
          id: 123,
          text: 'Anonymous comment',
          created_at: '2009-02-13T23:31:30.000Z'
        }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await fetchHackerNewsComments('https://news.ycombinator.com/item?id=12345')
    expect(result[0].author).toBe('Anonymous')
  })
})

describe('fetchCommentsForPlatform', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should route to correct platform function', async () => {
    const mockV2exResponse = [{ id: 1, content: 'test', created: 1234567890 }]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockV2exResponse
    } as Response)

    const discussion: ExternalDiscussion = {
      platform: 'v2ex',
      url: 'https://v2ex.com/t/12345'
    }

    const result = await fetchCommentsForPlatform(discussion)

    expect(result).toHaveLength(1)
    expect(result[0].platform).toBe('v2ex')
  })

  it('should handle unsupported platform', async () => {
    const discussion = {
      platform: 'unsupported' as any,
      url: 'https://example.com'
    }

    const result = await fetchCommentsForPlatform(discussion)

    expect(result).toEqual([])
    expect(console.warn).toHaveBeenCalledWith('Unsupported platform: unsupported')
  })
})

describe('fetchAllExternalComments', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should fetch comments from multiple platforms', async () => {
    // Mock V2EX response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, content: 'v2ex comment', created: 1234567890 }]
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
                  body: 'reddit comment',
                  created_utc: 1234567890,
                  score: 10
                }
              }
            ]
          }
        }
      ]
    } as Response)

    const discussions: ExternalDiscussion[] = [
      { platform: 'v2ex', url: 'https://v2ex.com/t/12345' },
      { platform: 'reddit', url: 'https://reddit.com/r/test/comments/123/' }
    ]

    const result = await fetchAllExternalComments(discussions)

    expect(Object.keys(result)).toEqual(['v2ex', 'reddit'])
    expect(result.v2ex).toHaveLength(1)
    expect(result.reddit).toHaveLength(1)
  })

  it('should handle mixed success and failure', async () => {
    // Mock successful V2EX response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, content: 'v2ex comment', created: 1234567890 }]
    } as Response)

    // Mock failed Reddit response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    } as Response)

    const discussions: ExternalDiscussion[] = [
      { platform: 'v2ex', url: 'https://v2ex.com/t/12345' },
      { platform: 'reddit', url: 'https://reddit.com/r/test/comments/123/' }
    ]

    const result = await fetchAllExternalComments(discussions)

    expect(result.v2ex).toHaveLength(1)
    expect(result.reddit).toEqual([]) // Should be empty array on failure
  })

  it('should handle empty discussions array', async () => {
    const result = await fetchAllExternalComments([])
    expect(result).toEqual({})
  })
})

describe('HTML entity decoding', () => {
  it('should decode common HTML entities in HN comments', async () => {
    const mockResponse = {
      children: [
        {
          id: 123,
          author: 'user',
          text: '&quot;quotes&quot; &amp; &lt;tags&gt; &#x27;apostrophe&#x27; &#x2F;slash&#x2F;',
          created_at: '2009-02-13T23:31:30.000Z'
        }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await fetchHackerNewsComments('https://news.ycombinator.com/item?id=12345')
    
    expect(result[0].content).toBe('"quotes" & <tags> \'apostrophe\' /slash/')
  })

  it('should decode numeric HTML entities', async () => {
    const mockResponse = {
      children: [
        {
          id: 123,
          author: 'user',
          text: '&#65;letter A&#65; and &#8220;smart quotes&#8221;',
          created_at: '2009-02-13T23:31:30.000Z'
        }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await fetchHackerNewsComments('https://news.ycombinator.com/item?id=12345')
    
    expect(result[0].content).toContain('letter A')
    expect(result[0].content).toContain('smart quotes')
  })
})