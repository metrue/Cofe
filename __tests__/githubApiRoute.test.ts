/**
 * Simple API route tests focusing on the rate limit solution
 */

import { GET } from '@/app/api/github/route'

// Mock dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/client', () => ({
  createOptimizedGitHubClient: jest.fn(),
  createGitHubAPIClient: jest.fn(),
}))

// Simple mock request
const createMockRequest = (url: string) => ({
  url,
  searchParams: new URLSearchParams(new URL(url).search),
})

describe('GitHub API Route - Rate Limit Features', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should support public access with owner parameter', async () => {
    const { getServerSession } = require('next-auth/next')
    const { createOptimizedGitHubClient } = require('@/lib/client')

    // Mock no session (public user)
    getServerSession.mockResolvedValue(null)

    // Mock client
    const mockClient = {
      getBlogPosts: jest.fn().mockResolvedValue([
        { id: 'test', title: 'Test Post', content: 'content' }
      ])
    }
    createOptimizedGitHubClient.mockReturnValue(mockClient)

    const request = createMockRequest('http://test.com/api/github?action=getBlogPosts&owner=testuser')
    const response = await GET(request as any)
    const data = await response.json()

    // ✅ Public access works
    expect(createOptimizedGitHubClient).toHaveBeenCalledWith('testuser')
    expect(mockClient.getBlogPosts).toHaveBeenCalled()
    expect(data).toHaveLength(1)
  })

  it('should require owner for public access', async () => {
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(null)

    const request = createMockRequest('http://test.com/api/github?action=getBlogPosts')
    const response = await GET(request as any)
    const data = await response.json()

    // ✅ Requires owner param for public access
    expect(response.status).toBe(400)
    expect(data.error).toBe('Owner parameter required for public access')
  })

  it('should handle authenticated users with fallback', async () => {
    const { getServerSession } = require('next-auth/next')
    const { createOptimizedGitHubClient } = require('@/lib/client')

    // Mock authenticated session
    getServerSession.mockResolvedValue({
      accessToken: 'token123',
      user: { id: '1' }
    })

    // Mock client with proper response
    const mockClient = {
      getMemos: jest.fn().mockResolvedValue([
        { id: '1', content: 'Auth memo', timestamp: '2024-01-01' }
      ])
    }
    createOptimizedGitHubClient.mockReturnValue(mockClient)

    const request = createMockRequest('http://test.com/api/github?action=getMemos&owner=authuser')
    const response = await GET(request as any)
    const data = await response.json()

    // ✅ Authenticated access works with owner param
    expect(createOptimizedGitHubClient).toHaveBeenCalledWith('authuser', 'token123')
    expect(Array.isArray(data)).toBe(true)
    if (Array.isArray(data) && data.length > 0) {
      expect(data[0].content).toBe('Auth memo')
    }
  })
})