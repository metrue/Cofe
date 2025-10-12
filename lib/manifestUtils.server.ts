import fs from 'fs/promises'
import path from 'path'

/**
 * Generate blog manifest for local development
 * This function is only available on the server side
 */
export async function updateLocalBlogManifest(): Promise<void> {
  try {
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