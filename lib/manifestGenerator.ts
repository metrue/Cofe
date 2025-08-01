import { Octokit } from '@octokit/rest'
import fs from 'fs/promises'
import path from 'path'

const REPO = 'Cofe'

/**
 * Generate a manifest file for blog posts to enable raw URL discovery
 * This should be run when blog posts are added/updated
 */
export async function generateBlogManifest(accessToken: string): Promise<void> {
  try {
    const octokit = new Octokit({ auth: accessToken })
    const { data: user } = await octokit.users.getAuthenticated()
    const owner = user.login

    // Get all blog files from GitHub
    const response = await octokit.repos.getContent({
      owner,
      repo: REPO,
      path: 'data/blog',
    })

    if (!Array.isArray(response.data)) {
      console.warn('Unexpected response from GitHub API: data is not an array')
      return
    }

    const blogFiles = response.data
      .filter(file => file.type === 'file' && file.name !== '.gitkeep' && file.name.endsWith('.md'))
      .map(file => file.name)
      .sort()

    const manifest = {
      files: blogFiles,
      generated: new Date().toISOString(),
      total: blogFiles.length
    }

    // Update the manifest in GitHub
    let existingSha: string | undefined
    try {
      const existingFile = await octokit.repos.getContent({
        owner,
        repo: REPO,
        path: 'data/blog-manifest.json',
      })
      
      if (!Array.isArray(existingFile.data) && 'sha' in existingFile.data) {
        existingSha = existingFile.data.sha
      }
    } catch (error) {
      // File doesn't exist, that's okay
    }

    const params: any = {
      owner,
      repo: REPO,
      path: 'data/blog-manifest.json',
      message: 'Update blog manifest',
      content: Buffer.from(JSON.stringify(manifest, null, 2)).toString('base64'),
    }

    if (existingSha) {
      params.sha = existingSha
    }

    await octokit.repos.createOrUpdateFileContents(params)
    console.log('Blog manifest updated successfully')
  } catch (error) {
    console.error('Error generating blog manifest:', error)
    throw error
  }
}

/**
 * Generate manifest locally for development
 */
export async function generateLocalBlogManifest(): Promise<void> {
  try {
    const blogDir = path.join(process.cwd(), 'data', 'blog')
    
    // Check if blog directory exists
    try {
      await fs.access(blogDir)
    } catch {
      console.log('Blog directory does not exist locally')
      return
    }

    const files = await fs.readdir(blogDir)
    const blogFiles = files
      .filter(file => file.endsWith('.md') && file !== '.gitkeep')
      .sort()

    const manifest = {
      files: blogFiles,
      generated: new Date().toISOString(),
      total: blogFiles.length
    }

    await fs.writeFile(
      path.join(blogDir, 'blog-manifest.json'),
      JSON.stringify(manifest, null, 2)
    )

    console.log(`Local blog manifest generated with ${blogFiles.length} files`)
  } catch (error) {
    console.error('Error generating local blog manifest:', error)
    throw error
  }
}