import { Octokit } from '@octokit/rest'

/**
 * Generate and update the blog manifest file based on published blog posts
 * This manifest is used by PublicGitHubClient for unauthenticated access
 */
export async function updateBlogManifest(accessToken: string, owner: string, repo: string): Promise<void> {
  try {
    const octokit = new Octokit({ auth: accessToken })
    
    // Get all blog post files from the repository
    const { data: files } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'data/blog',
    })
    
    if (!Array.isArray(files)) {
      console.error('Expected array of files but got:', typeof files)
      return
    }
    
    // Filter for markdown files only (excluding .gitkeep and other files)
    const blogFiles = files
      .filter(file => 
        file.type === 'file' && 
        file.name.endsWith('.md') && 
        file.name !== '.gitkeep'
      )
      .map(file => file.name)
      .sort() // Sort alphabetically for consistency
    
    // Create the manifest object
    const manifest = {
      files: blogFiles
    }
    
    // Get current manifest file SHA (if it exists)
    let currentSha: string | undefined
    try {
      const { data: currentManifest } = await octokit.repos.getContent({
        owner,
        repo,
        path: 'data/blog-manifest.json',
      })
      
      if (!Array.isArray(currentManifest) && 'sha' in currentManifest) {
        currentSha = currentManifest.sha
      }
    } catch (error) {
      // Manifest doesn't exist yet, that's ok
      console.log('Blog manifest does not exist yet, will create it')
    }
    
    // Update or create the manifest file
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'data/blog-manifest.json',
      message: 'Update blog manifest',
      content: Buffer.from(JSON.stringify(manifest, null, 2)).toString('base64'),
      sha: currentSha, // Required for updates, undefined for creates
    })
    
    console.log('Blog manifest updated successfully with', blogFiles.length, 'files')
  } catch (error) {
    console.error('Failed to update blog manifest:', error)
    // Don't throw - manifest update failure shouldn't break blog post operations
  }
}

/**
 * Generate blog manifest for local development
 */
export async function updateLocalBlogManifest(): Promise<void> {
  if (typeof window !== 'undefined') {
    console.warn('updateLocalBlogManifest should only be called on the server')
    return
  }
  
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const blogDir = path.join(process.cwd(), 'data', 'blog')
    const files = await fs.readdir(blogDir)
    
    const blogFiles = files
      .filter(file => file.endsWith('.md') && file !== '.gitkeep')
      .sort()
    
    const manifest = {
      files: blogFiles
    }
    
    const manifestPath = path.join(process.cwd(), 'data', 'blog-manifest.json')
    await fs.writeFile(
      manifestPath, 
      JSON.stringify(manifest, null, 2),
      'utf-8'
    )
    
    console.log('Local blog manifest updated successfully with', blogFiles.length, 'files')
  } catch (error) {
    console.error('Failed to update local blog manifest:', error)
  }
}