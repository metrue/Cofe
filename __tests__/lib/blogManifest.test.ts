/**
 * Unit tests for BlogManifestManager
 */

import { BlogManifestManager } from '@/lib/blogManifest'
import { Octokit } from '@octokit/rest'

// Mock dependencies
jest.mock('@/lib/githubUtils', () => ({
  isNotFoundError: jest.fn(),
}))

describe('BlogManifestManager', () => {
  let mockOctokit: jest.Mocked<Octokit>
  let manager: BlogManifestManager
  const mockOwner = 'testuser'
  const mockRepo = 'Cofe'

  beforeEach(() => {
    jest.clearAllMocks()
    mockOctokit = {
      repos: {
        getContent: jest.fn(),
        createOrUpdateFileContents: jest.fn(),
      }
    } as any
    manager = new BlogManifestManager(mockOctokit, mockOwner, mockRepo)
    
    // Setup default mocks
    ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockResolvedValue({ 
      data: { content: 'eyJmaWxlcyI6W119', sha: 'test-sha' } 
    })
    ;(mockOctokit.repos.createOrUpdateFileContents as unknown as jest.Mock).mockResolvedValue({ 
      data: {} 
    })
  })

  describe('getManifest', () => {
    it('should return existing manifest with SHA', async () => {
      const existingManifest = { files: ['post1.md', 'post2.md'] }
      
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockResolvedValueOnce({
        data: { 
          content: Buffer.from(JSON.stringify(existingManifest)).toString('base64'), 
          sha: 'manifest-sha' 
        }
      })

      const result = await manager.getManifest()

      expect(result.manifest).toEqual(existingManifest)
      expect(result.sha).toBe('manifest-sha')
      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        path: 'data/blog-manifest.json'
      })
    })

    it('should return empty manifest when file does not exist', async () => {
      const { isNotFoundError } = require('@/lib/githubUtils')
      isNotFoundError.mockReturnValue(true)
      
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockRejectedValueOnce({ status: 404 })

      const result = await manager.getManifest()

      expect(result.manifest).toEqual({ files: [] })
      expect(result.sha).toBeUndefined()
    })

    it('should propagate non-404 errors', async () => {
      const { isNotFoundError } = require('@/lib/githubUtils')
      isNotFoundError.mockReturnValue(false)
      
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      await expect(manager.getManifest()).rejects.toThrow('API Error')
    })
  })

  describe('saveManifest', () => {
    it('should save manifest without SHA for new file', async () => {
      const manifest = { files: ['new-post.md'] }

      await manager.saveManifest(manifest)

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        path: 'data/blog-manifest.json',
        message: 'Update blog manifest',
        content: Buffer.from(JSON.stringify(manifest, null, 2)).toString('base64'),
      })
    })

    it('should save manifest with SHA for existing file', async () => {
      const manifest = { files: ['updated-post.md'] }
      const sha = 'existing-sha'

      await manager.saveManifest(manifest, sha)

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        path: 'data/blog-manifest.json',
        message: 'Update blog manifest',
        content: Buffer.from(JSON.stringify(manifest, null, 2)).toString('base64'),
        sha: sha,
      })
    })
  })

  describe('addPost', () => {
    it('should add new post to beginning of manifest', async () => {
      const existingManifest = { files: ['old-post.md'] }
      
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockResolvedValueOnce({
        data: { 
          content: Buffer.from(JSON.stringify(existingManifest)).toString('base64'), 
          sha: 'manifest-sha' 
        }
      })

      await manager.addPost('new-post.md')

      const expectedManifest = { files: ['new-post.md', 'old-post.md'] }
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          content: Buffer.from(JSON.stringify(expectedManifest, null, 2)).toString('base64'),
          sha: 'manifest-sha'
        })
      )
    })

    it('should not add duplicate posts', async () => {
      const existingManifest = { files: ['existing-post.md'] }
      
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockResolvedValueOnce({
        data: { 
          content: Buffer.from(JSON.stringify(existingManifest)).toString('base64'), 
          sha: 'manifest-sha' 
        }
      })

      await manager.addPost('existing-post.md')

      // Should not have called save since the post already exists
      expect(mockOctokit.repos.createOrUpdateFileContents).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      // Should not throw error
      await expect(manager.addPost('test-post.md')).resolves.toBeUndefined()
    })
  })

  describe('removePost', () => {
    it('should remove post from manifest', async () => {
      const existingManifest = { files: ['post-to-remove.md', 'post-to-keep.md'] }
      
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockResolvedValueOnce({
        data: { 
          content: Buffer.from(JSON.stringify(existingManifest)).toString('base64'), 
          sha: 'manifest-sha' 
        }
      })

      await manager.removePost('post-to-remove.md')

      const expectedManifest = { files: ['post-to-keep.md'] }
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          content: Buffer.from(JSON.stringify(expectedManifest, null, 2)).toString('base64'),
          sha: 'manifest-sha'
        })
      )
    })

    it('should handle removing non-existent post', async () => {
      const existingManifest = { files: ['existing-post.md'] }
      
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockResolvedValueOnce({
        data: { 
          content: Buffer.from(JSON.stringify(existingManifest)).toString('base64'), 
          sha: 'manifest-sha' 
        }
      })

      await manager.removePost('non-existent-post.md')

      // Should still save the manifest (no change, but that's okay)
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      // Should not throw error
      await expect(manager.removePost('test-post.md')).resolves.toBeUndefined()
    })
  })

  describe('ensureManifestExists', () => {
    it('should create manifest if it does not exist', async () => {
      const { isNotFoundError } = require('@/lib/githubUtils')
      isNotFoundError.mockReturnValue(true)
      
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockRejectedValueOnce({ status: 404 })

      await manager.ensureManifestExists()

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          content: Buffer.from(JSON.stringify({ files: [] }, null, 2)).toString('base64'),
        })
      )
    })

    it('should do nothing if manifest already exists', async () => {
      // Default mock returns existing manifest
      await manager.ensureManifestExists()

      // Should not have tried to create the manifest
      expect(mockOctokit.repos.createOrUpdateFileContents).not.toHaveBeenCalled()
    })

    it('should propagate non-404 errors', async () => {
      const { isNotFoundError } = require('@/lib/githubUtils')
      isNotFoundError.mockReturnValue(false)
      
      ;(mockOctokit.repos.getContent as unknown as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      await expect(manager.ensureManifestExists()).rejects.toThrow('API Error')
    })
  })
})