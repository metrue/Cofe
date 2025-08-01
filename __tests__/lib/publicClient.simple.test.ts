import { PublicGitHubClient } from '@/lib/publicClient'

// Mock the cache module
jest.mock('@/lib/cache', () => ({
  getCachedOrFetch: jest.fn((key, fetcher) => fetcher()),
}))

describe('PublicGitHubClient - Simple Tests', () => {
  let client: PublicGitHubClient
  const mockOwner = 'testuser'

  beforeEach(() => {
    client = new PublicGitHubClient(mockOwner)
    jest.clearAllMocks()
  })

  describe('Basic functionality', () => {
    it('should create a client instance', () => {
      expect(client).toBeInstanceOf(PublicGitHubClient)
    })

    it('should fetch memos successfully', async () => {
      const mockMemos = [
        { id: '1', content: 'Test memo', timestamp: '2024-01-01T00:00:00.000Z' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMemos),
      })

      const result = await client.getMemos()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/testuser/Cofe/main/data/memos.json'
      )
      expect(result).toEqual(mockMemos)
    })

    it('should handle 404 responses gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await client.getMemos()
      expect(result).toEqual([])
    })
  })

  describe('Rate limit avoidance', () => {
    it('should not make any API calls to api.github.com', async () => {
      const mockMemos = [
        { id: '1', content: 'No API call memo', timestamp: '2024-01-01T00:00:00.000Z' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMemos),
      })

      await client.getMemos()

      // Verify only raw GitHub URL was called, not API
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('raw.githubusercontent.com')
      )
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('api.github.com')
      )
    })

    it('should handle multiple concurrent requests without rate limits', async () => {
      const mockMemos = [
        { id: '1', content: 'Concurrent memo', timestamp: '2024-01-01T00:00:00.000Z' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMemos),
      })

      // Simulate 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => client.getMemos())
      const results = await Promise.all(promises)

      // All should succeed
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toEqual(mockMemos)
      })

      // Should use raw URLs for all requests
      expect(global.fetch).toHaveBeenCalledTimes(10)
    })
  })
})