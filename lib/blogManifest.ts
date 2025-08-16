/**
 * Blog manifest management utilities
 * Handles the blog-manifest.json file that tracks all blog posts
 */

import { Octokit } from '@octokit/rest'
import { isNotFoundError, type UpdateFileParams } from './githubUtils'

export interface BlogManifest {
  files: string[]
}

export class BlogManifestManager {
  constructor(
    private octokit: Octokit,
    private owner: string,
    private repo: string
  ) {}

  private get manifestPath() {
    return 'data/blog-manifest.json'
  }

  /**
   * Fetch the current blog manifest
   */
  async getManifest(): Promise<{ manifest: BlogManifest; sha?: string }> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: this.manifestPath,
      })

      if (!Array.isArray(response.data) && 'content' in response.data) {
        const existingContent = Buffer.from(response.data.content, 'base64').toString('utf-8')
        const manifest = JSON.parse(existingContent) as BlogManifest
        return { manifest, sha: response.data.sha }
      }
    } catch (error) {
      if (isNotFoundError(error)) {
        // Manifest doesn't exist, return empty manifest
        return { manifest: { files: [] } }
      }
      throw error
    }

    return { manifest: { files: [] } }
  }

  /**
   * Save the blog manifest
   */
  async saveManifest(manifest: BlogManifest, sha?: string): Promise<void> {
    const updateParams: UpdateFileParams = {
      owner: this.owner,
      repo: this.repo,
      path: this.manifestPath,
      message: `Update blog manifest`,
      content: Buffer.from(JSON.stringify(manifest, null, 2)).toString('base64'),
    }

    if (sha) {
      updateParams.sha = sha
    }

    await this.octokit.repos.createOrUpdateFileContents(updateParams)
  }

  /**
   * Add a blog post to the manifest
   */
  async addPost(filename: string): Promise<void> {
    try {
      const { manifest, sha } = await this.getManifest()
      
      if (!manifest.files.includes(filename)) {
        manifest.files.unshift(filename) // Add to beginning for newest first
        await this.saveManifest(manifest, sha)
      }
    } catch (error) {
      console.error('Error adding post to blog manifest:', error)
      // Don't fail the whole operation if manifest update fails
    }
  }

  /**
   * Remove a blog post from the manifest
   */
  async removePost(filename: string): Promise<void> {
    try {
      const { manifest, sha } = await this.getManifest()
      
      manifest.files = manifest.files.filter(f => f !== filename)
      await this.saveManifest(manifest, sha)
    } catch (error) {
      console.error('Error removing post from blog manifest:', error)
      // Don't fail the whole operation if manifest update fails
    }
  }

  /**
   * Initialize manifest if it doesn't exist
   */
  async ensureManifestExists(): Promise<void> {
    const { manifest, sha } = await this.getManifest()
    
    // If we got a manifest without a SHA, it means it was created as empty
    // and doesn't exist in the repository yet, so we need to save it
    if (!sha) {
      await this.saveManifest(manifest)
    }
  }
}