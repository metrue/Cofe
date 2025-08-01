#!/usr/bin/env node

/**
 * Script to generate blog manifest for existing blog posts
 * Run with: node scripts/generateManifest.js
 */

const { generateBlogManifest, generateLocalBlogManifest } = require('../lib/manifestGenerator.ts')

async function main() {
  console.log('Generating blog manifest...')
  
  try {
    // Try to generate local manifest first
    await generateLocalBlogManifest()
    console.log('Local manifest generated successfully')
    
    // If GITHUB_TOKEN is available, also update remote manifest
    const githubToken = process.env.GITHUB_TOKEN
    if (githubToken) {
      console.log('Updating remote manifest...')
      await generateBlogManifest(githubToken)
      console.log('Remote manifest updated successfully')
    } else {
      console.log('No GITHUB_TOKEN found, skipping remote manifest update')
      console.log('To update remote manifest, set GITHUB_TOKEN and run again')
    }
  } catch (error) {
    console.error('Error generating manifest:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}