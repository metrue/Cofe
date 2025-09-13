import { jest } from '@jest/globals'
import { SmartClient } from '../../lib/smartClient'

// Mock the dependencies
jest.mock('../../lib/publicClient')
jest.mock('../../lib/client')

// Mock dynamic import for localClient.server
const mockLocalClient = {
  getBlogPosts: jest.fn(),
  getMemos: jest.fn(),
  getLikes: jest.fn(),
  getLinks: jest.fn(),
  createMemo: jest.fn(),
  updateLikes: jest.fn()
}

jest.unstable_mockModule('../../lib/localClient.server', () => ({
  createLocalFileSystemClient: () => mockLocalClient
}))

const mockGitHubClient = {
  getBlogPosts: jest.fn(),
  getMemos: jest.fn(),
  getLikes: jest.fn(),
  getLinks: jest.fn(),
  updateLikes: jest.fn()
}

jest.mock('../../lib/publicClient', () => ({
  createPublicGitHubClient: () => mockGitHubClient
}))

jest.mock('../../lib/client', () => ({
  createGitHubAPIClient: () => mockGitHubClient
}))

// Mock environment variables
const originalEnv = process.env
const originalWindow = global.window

describe('SmartClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    // Simulate server-side environment
    delete (global as any).window
  })

  afterEach(() => {
    process.env = originalEnv
    global.window = originalWindow
  })

  describe('development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      process.env.GITHUB_USERNAME = 'testuser'
    })

    it('should use local client for getBlogPosts', async () => {
      const client = new SmartClient()
      const mockPosts = [{ id: '1', title: 'Test Post' }]
      mockLocalClient.getBlogPosts.mockResolvedValue(mockPosts)

      const result = await client.getBlogPosts()

      expect(result).toEqual(mockPosts)
      expect(mockLocalClient.getBlogPosts).toHaveBeenCalled()
      expect(mockGitHubClient.getBlogPosts).not.toHaveBeenCalled()
    })

    it('should use local client for getMemos', async () => {
      const client = new SmartClient()
      const mockMemos = [{ id: '1', content: 'Test memo' }]
      mockLocalClient.getMemos.mockResolvedValue(mockMemos)

      const result = await client.getMemos()

      expect(result).toEqual(mockMemos)
      expect(mockLocalClient.getMemos).toHaveBeenCalled()
      expect(mockGitHubClient.getMemos).not.toHaveBeenCalled()
    })

    it('should use local client for createMemo', async () => {
      const client = new SmartClient()
      const newMemo = { id: '2', content: 'New memo', timestamp: '2025-01-01T00:00:00Z' }
      mockLocalClient.createMemo.mockResolvedValue(newMemo)

      const result = await client.createMemo(newMemo)

      expect(result).toEqual(newMemo)
      expect(mockLocalClient.createMemo).toHaveBeenCalledWith(newMemo)
    })

    it('should use local client for updateLikes', async () => {
      const client = new SmartClient()
      const likesData = { 'blog:test': { 'like1': { timestamp: '2025-01-01T00:00:00Z' } } }

      await client.updateLikes(likesData)

      expect(mockLocalClient.updateLikes).toHaveBeenCalledWith(likesData)
    })
  })

  describe('production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      process.env.GITHUB_USERNAME = 'testuser'
    })

    it('should use GitHub client for getBlogPosts', async () => {
      const client = new SmartClient()
      const mockPosts = [{ id: '1', title: 'Test Post' }]
      mockGitHubClient.getBlogPosts.mockResolvedValue(mockPosts)

      const result = await client.getBlogPosts()

      expect(result).toEqual(mockPosts)
      expect(mockGitHubClient.getBlogPosts).toHaveBeenCalled()
      expect(mockLocalClient.getBlogPosts).not.toHaveBeenCalled()
    })

    it('should use GitHub client for getMemos', async () => {
      const client = new SmartClient()
      const mockMemos = [{ id: '1', content: 'Test memo' }]
      mockGitHubClient.getMemos.mockResolvedValue(mockMemos)

      const result = await client.getMemos()

      expect(result).toEqual(mockMemos)
      expect(mockGitHubClient.getMemos).toHaveBeenCalled()
      expect(mockLocalClient.getMemos).not.toHaveBeenCalled()
    })

    it('should throw error when GITHUB_USERNAME is missing', async () => {
      delete process.env.GITHUB_USERNAME
      const client = new SmartClient()

      await expect(client.getBlogPosts()).rejects.toThrow(
        'GITHUB_USERNAME environment variable is required for production'
      )
    })

    it('should require authentication for createMemo in production', async () => {
      const client = new SmartClient() // No access token
      const newMemo = { id: '2', content: 'New memo', timestamp: '2025-01-01T00:00:00Z' }

      await expect(client.createMemo(newMemo)).rejects.toThrow(
        'Authentication required for memo creation'
      )
    })

    it('should create memo with authentication in production', async () => {
      const client = new SmartClient('test-token')
      const newMemo = { id: '2', content: 'New memo', timestamp: '2025-01-01T00:00:00Z' }
      
      // Mock the complex GitHub API interactions
      const mockOctokit = {
        users: {
          getAuthenticated: jest.fn().mockResolvedValue({ data: { login: 'testuser' } })
        },
        repos: {
          getContent: jest.fn().mockResolvedValue({
            data: { sha: 'test-sha' }
          }),
          createOrUpdateFileContents: jest.fn().mockResolvedValue({})
        }
      }

      jest.unstable_mockModule('@octokit/rest', () => ({
        Octokit: jest.fn(() => mockOctokit)
      }))

      mockGitHubClient.getMemos.mockResolvedValue([])

      const result = await client.createMemo(newMemo)

      expect(result).toEqual(newMemo)
    })
  })

  describe('client-side environment', () => {
    beforeEach(() => {
      // Simulate client-side environment
      global.window = {} as any
      process.env.NODE_ENV = 'development'
      process.env.GITHUB_USERNAME = 'testuser'
    })

    it('should use GitHub client even in development when on client-side', async () => {
      const client = new SmartClient()
      const mockPosts = [{ id: '1', title: 'Test Post' }]
      mockGitHubClient.getBlogPosts.mockResolvedValue(mockPosts)

      const result = await client.getBlogPosts()

      expect(result).toEqual(mockPosts)
      expect(mockGitHubClient.getBlogPosts).toHaveBeenCalled()
      expect(mockLocalClient.getBlogPosts).not.toHaveBeenCalled()
    })
  })
})