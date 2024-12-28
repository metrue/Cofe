import { Memo } from './types'
import { Octokit } from '@octokit/rest'
import path from 'path'

type UpdateFileParams = Parameters<Octokit['repos']['createOrUpdateFileContents']>[0]

const REPO = 'Cofe'

function getOctokit(accessToken: string | undefined) {
  if (!accessToken) {
    throw new Error('Access token is required')
  }
  return new Octokit({ auth: accessToken })
}

async function getRepoInfo(accessToken: string | undefined) {
  if (!accessToken) {
    throw new Error('Access token is required')
  }
  const octokit = getOctokit(accessToken)
  try {
    const { data: user } = await octokit.users.getAuthenticated()
    return {
      owner: user.login,
      repo: REPO,
    }
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    throw new Error('Failed to get authenticated user')
  }
}

async function ensureRepoExists(octokit: Octokit, owner: string, repo: string) {
  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo })

    // Check if the repository description is empty.
    if (!repoData.description) {
      // Get the authenticated user's login
      const { data: userData } = await octokit.users.getAuthenticated()
      const userLogin = userData.login

      // Update the repository with the new description
      await octokit.repos.update({
        owner,
        repo,
        description: `https://tinymind.me/${userLogin}`,
      })
      console.log(`Updated repository description to https://tinymind.me/${userLogin}`)
    }
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      await octokit.repos.createForAuthenticatedUser({
        name: repo,
        auto_init: true,
      })
      console.log(`Created new repository: ${repo}`)
    } else {
      throw error
    }
  }

  // Check if README.md exists and needs updating
  try {
    const { data: readmeContent } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'README.md',
    })
    console.log('README content:', readmeContent)
    if ('content' in readmeContent) {
      const decodedContent = Buffer.from(readmeContent.content, 'base64').toString('utf-8')
      console.log('README Decoded content:', decodedContent.trim())
      if (decodedContent.trim() === '' || decodedContent.trim() === '# tinymind-blog') {
        // README.md is empty or contains only the default repo name, update it
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: 'README.md',
          message: 'Update README.md with default content',
          content: Buffer.from(
            '# TinyMind Blog\n\nWrite blog posts and memos at https://tinymind.me with data stored on GitHub.'
          ).toString('base64'),
          sha: readmeContent.sha,
        })
        console.log('README.md updated with default content')
      }
    }
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      // Create README.md if it doesn't exist
      const content = Buffer.from(
        'Write blog posts and memos at https://tinymind.me with data stored on GitHub.'
      ).toString('base64')
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'README.md',
        message: 'Initial commit: Add README.md',
        content,
      })
    } else {
      throw error
    }
  }
}

async function ensureContentStructure(octokit: Octokit, owner: string, repo: string) {
  async function createFileIfNotExists(
    octokit: Octokit,
    owner: string,
    repo: string,
    path: string,
    message: string,
    content: string
  ) {
    try {
      await octokit.repos.getContent({
        owner,
        repo,
        path,
      })
      console.log(`File ${path} already exists.`)
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        console.log(`Creating file ${path}...`)
        try {
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: Buffer.from(content).toString('base64'), // Encode content to Base64
          })
          console.log(`File ${path} created successfully.`)
        } catch (createError) {
          console.error(`Error creating file ${path}:`, createError)
          throw createError
        }
      } else {
        console.error(`Error checking file ${path}:`, error)
        throw error
      }
    }
  }

  try {
    await createFileIfNotExists(
      octokit,
      owner,
      repo,
      'data/.gitkeep',
      'Initialize content directory',
      ''
    )
    await createFileIfNotExists(
      octokit,
      owner,
      repo,
      'data/blog/.gitkeep',
      'Initialize blog directory',
      ''
    )
    await createFileIfNotExists(
      octokit,
      owner,
      repo,
      'data/memos.json',
      'Initialize memos.json',
      '[]'
    )
  } catch (error) {
    console.error('Error ensuring content structure:', error)
    throw error
  }
}

async function initializeGitHubStructure(octokit: Octokit, owner: string, repo: string) {
  await ensureRepoExists(octokit, owner, repo)
  await ensureContentStructure(octokit, owner, repo)
}

export async function createBlogPost(
  title: string,
  content: string,
  accessToken: string
): Promise<void> {
  const octokit = getOctokit(accessToken)
  const { owner, repo } = await getRepoInfo(accessToken)
  await initializeGitHubStructure(octokit, owner, repo)

  const path = `data/blog/${title.toLowerCase().replace(/\s+/g, '-')}.md`
  const date = new Date().toISOString() // Store full ISO string
  const fullContent = `---
title: ${title}
date: ${date}
---

${content}`

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `Add blog post: ${title}`,
    content: Buffer.from(fullContent).toString('base64'),
  })
}

export async function createMemo(
  content: string,
  image: string | undefined,
  accessToken: string
): Promise<void> {
  console.log('Creating memo...')
  if (!accessToken) {
    throw new Error('Access token is required')
  }
  const octokit = getOctokit(accessToken)
  console.log('Octokit instance created')

  try {
    const { owner, repo } = await getRepoInfo(accessToken)
    console.log('Repo info:', { owner, repo })

    await initializeGitHubStructure(octokit, owner, repo)
    console.log('GitHub structure initialized')

    let memos: Memo[] = []
    let existingSha: string | undefined

    // Try to fetch existing memos
    try {
      console.log('Fetching existing memos...')
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: 'data/memos.json',
      })

      if (!Array.isArray(response.data) && 'content' in response.data) {
        const existingContent = Buffer.from(response.data.content, 'base64').toString('utf-8')
        memos = JSON.parse(existingContent) as Memo[]
        existingSha = response.data.sha
        console.log('Existing memos fetched')
      }
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        console.log('memos.json does not exist, creating a new file')
      } else {
        console.error('Error fetching existing memos:', error)
        throw error
      }
    }

    // Create new memo
    const newMemo: Memo = {
      id: Date.now().toString(),
      content,
      timestamp: new Date().toISOString(),
      image,
    }

    // Add new memo to the beginning of the array
    memos.unshift(newMemo)

    console.log('Updating memos file...')
    // Create or update the file with all memos
    const updateParams: UpdateFileParams = {
      owner,
      repo,
      path: 'data/memos.json',
      message: 'Add new memo',
      content: Buffer.from(JSON.stringify(memos, null, 2)).toString('base64'),
    }

    if (existingSha) {
      updateParams.sha = existingSha
    }

    await octokit.repos.createOrUpdateFileContents(updateParams)

    console.log('Memo created successfully')
  } catch (error) {
    console.error('Error creating memo:', error)
    throw error
  }
}

export async function deleteMemo(id: string, accessToken: string): Promise<void> {
  console.log('Deleting memo...')
  if (!accessToken) {
    throw new Error('Access token is required')
  }
  const octokit = getOctokit(accessToken)
  console.log('Octokit instance created')

  try {
    const { owner, repo } = await getRepoInfo(accessToken)
    console.log('Repo info:', { owner, repo })

    await initializeGitHubStructure(octokit, owner, repo)
    console.log('GitHub structure initialized')

    let memos: Memo[] = []
    let existingSha: string | undefined

    // Fetch existing memos
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'data/memos.json',
    })

    if (!Array.isArray(response.data) && 'content' in response.data) {
      const existingContent = Buffer.from(response.data.content, 'base64').toString('utf-8')
      memos = JSON.parse(existingContent) as Memo[]
      existingSha = response.data.sha
      console.log('Existing memos fetched')
    }

    // Find and remove the memo
    const newMemos = memos.filter((t) => t.id !== id)
    console.log(newMemos)

    console.log('Updating memos file...')
    // Update the file with all memos
    const updateParams: UpdateFileParams = {
      owner,
      repo,
      path: 'data/memos.json',
      message: 'Delete a memo',
      content: Buffer.from(JSON.stringify(newMemos, null, 2)).toString('base64'),
      sha: existingSha,
    }

    await octokit.repos.createOrUpdateFileContents(updateParams)

    console.log('Memo deleted successfully')
  } catch (error) {
    console.error('Error deleting memo:', error)
    throw error
  }
}

export async function updateMemo(
  id: string,
  content: string,
  accessToken: string
): Promise<void> {
  console.log('Updating memo...')
  if (!accessToken) {
    throw new Error('Access token is required')
  }
  const octokit = getOctokit(accessToken)
  console.log('Octokit instance created')

  try {
    const { owner, repo } = await getRepoInfo(accessToken)
    console.log('Repo info:', { owner, repo })

    await initializeGitHubStructure(octokit, owner, repo)
    console.log('GitHub structure initialized')

    let memos: Memo[] = []
    let existingSha: string | undefined

    // Fetch existing memos
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'data/memos.json',
    })

    if (!Array.isArray(response.data) && 'content' in response.data) {
      const existingContent = Buffer.from(response.data.content, 'base64').toString('utf-8')
      memos = JSON.parse(existingContent) as Memo[]
      existingSha = response.data.sha
      console.log('Existing memos fetched')
    }

    // Find and update the memo
    const memoIndex = memos.findIndex((t) => t.id === id)
    if (memoIndex === -1) {
      throw new Error('Memo not found')
    }

    memos[memoIndex] = {
      ...memos[memoIndex],
      content,
      // Removed the timestamp update to keep the original timestamp
    }

    console.log('Updating memos file...')
    // Update the file with all memos
    const updateParams: UpdateFileParams = {
      owner,
      repo,
      path: 'data/memos.json',
      message: 'Update memo',
      content: Buffer.from(JSON.stringify(memos, null, 2)).toString('base64'),
      sha: existingSha,
    }

    await octokit.repos.createOrUpdateFileContents(updateParams)

    console.log('Memo updated successfully')
  } catch (error) {
    console.error('Error updating memo:', error)
    throw error
  }
}

export async function deleteBlogPost(id: string, accessToken: string): Promise<void> {
  console.log('Deleting blog post...')
  if (!accessToken) {
    throw new Error('Access token is required')
  }
  const octokit = getOctokit(accessToken)

  try {
    const { owner, repo } = await getRepoInfo(accessToken)

    // Decode the ID and create the file path
    const decodedId = decodeURIComponent(id)
    const path = `data/blog/${decodedId}.md`

    console.log(`Attempting to delete file: ${path}`)

    // Get the current file to retrieve its SHA
    const currentFile = await octokit.repos.getContent({
      owner,
      repo,
      path,
    })

    if (Array.isArray(currentFile.data) || !('sha' in currentFile.data)) {
      throw new Error('Unexpected response when fetching current blog post')
    }

    // Delete the blog post file
    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message: 'Delete blog post',
      sha: currentFile.data.sha,
    })

    console.log('Blog post deleted successfully')
  } catch (error) {
    console.error('Error deleting blog post:', error)
    throw error
  }
}

async function getContent(octokit: Octokit, owner: string, repo: string, path: string) {
  const response = await octokit.repos.getContent({ owner, repo, path })
  if (Array.isArray(response.data) || !('content' in response.data)) {
    throw new Error('Unexpected response from GitHub API')
  }
  return {
    content: Buffer.from(response.data.content, 'base64').toString('utf-8'),
    sha: response.data.sha,
  }
}

async function updateFileContents(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  message: string,
  content: string,
  sha?: string
) {
  const params: UpdateFileParams = {
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
  }
  if (sha) {
    params.sha = sha
  }
  await octokit.repos.createOrUpdateFileContents(params)
}

export async function updateBlogPost(
  id: string,
  title: string,
  content: string,
  accessToken: string
): Promise<void> {
  console.log('Updating blog post...')
  if (!accessToken) {
    throw new Error('Access token is required')
  }
  const octokit = getOctokit(accessToken)

  try {
    const { owner, repo } = await getRepoInfo(accessToken)

    // Get the current file to retrieve its SHA and content
    const { content: existingContent, sha } = await getContent(
      octokit,
      owner,
      repo,
      `data/blog/${id}.md`
    )
    const dateMatch = existingContent.match(/date:\s*(.+)/)
    const date = dateMatch ? dateMatch[1] : new Date().toISOString()

    const updatedContent = `---
title: ${title}
date: ${date}
---

${content}`

    // Update the blog post file
    await updateFileContents(
      octokit,
      owner,
      repo,
      `data/blog/${id}.md`,
      'Update blog post',
      updatedContent,
      sha
    )

    console.log('Blog post updated successfully')
  } catch (error) {
    console.error('Error updating blog post:', error)
    throw error
  }
}

export async function uploadImage(file: File, accessToken: string): Promise<string> {
  console.log('Uploading image...')
  if (!accessToken) {
    throw new Error('Access token is required')
  }
  const octokit = getOctokit(accessToken)
  console.log('Octokit instance created')

  try {
    const { owner, repo } = await getRepoInfo(accessToken)
    console.log('Repo info:', { owner, repo })

    // Get the default branch
    const { data: repoData } = await octokit.repos.get({ owner, repo })
    const defaultBranch = repoData.default_branch
    console.log('Default branch:', defaultBranch)

    await initializeGitHubStructure(octokit, owner, repo)
    console.log('GitHub structure initialized')

    // Generate a unique filename
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const id = Date.now().toString()
    const ext = path.extname(file.name)
    const filename = `${id}${ext}`
    const filePath = `assets/images/${date}/${filename}`

    // Ensure the directory exists
    await ensureDirectoryExists(octokit, owner, repo, `assets/images/${date}`)

    // Convert file to base64
    const content = await fileToBase64(file)

    // Upload the file
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Upload image: ${filename}`,
      content,
    })
    console.log(response)

    console.log('Image uploaded successfully')

    // Modify the returned URL to use the correct format
    const rawUrl = response.data.content?.download_url
    if (rawUrl) {
      const parts = rawUrl.split('/')
      const username = parts[3]
      const repo = parts[4]
      const path = parts.slice(6).join('/')

      return `https://github.com/${username}/${repo}/blob/${defaultBranch}/${path}?raw=true`
    }

    throw new Error('Failed to get image URL')
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

async function ensureDirectoryExists(octokit: Octokit, owner: string, repo: string, path: string) {
  try {
    await octokit.repos.getContent({ owner, repo, path })
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      // Directory doesn't exist, create it
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `${path}/.gitkeep`,
        message: `Create directory: ${path}`,
        content: '',
      })
    } else {
      throw error
    }
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        resolve(reader.result.split(',')[1])
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = (error) => reject(error)
  })
}

export async function getUserLogin(accessToken: string): Promise<string> {
  const octokit = getOctokit(accessToken)
  const { data: user } = await octokit.users.getAuthenticated()
  return user.name ?? user.login
}

export async function getIconUrls(
  usernameOrAccessToken: string
): Promise<{ iconPath: string; appleTouchIconPath: string }> {
  let owner: string
  let repo: string
  let octokit: Octokit | null = null

  // Check if the input is an access token or a username
  if (usernameOrAccessToken.length > 40) {
    // Assuming access tokens are longer than usernames
    try {
      octokit = getOctokit(usernameOrAccessToken)
      const repoInfo = await getRepoInfo(usernameOrAccessToken)
      owner = repoInfo.owner
      repo = repoInfo.repo
    } catch (error) {
      console.error('Error getting authenticated user:', error)
      // Fallback to using the access token as a username
      owner = usernameOrAccessToken
      repo = REPO
    }
  } else {
    owner = usernameOrAccessToken
    repo = REPO
  }

  const defaultIconPath = `https://github.com/${owner}.png`
  const defaultAppleTouchIconPath = `https://github.com/${owner}.png`

  let iconPath = defaultIconPath
  let appleTouchIconPath = defaultAppleTouchIconPath

  if (octokit) {
    iconPath = await getIconUrl(octokit, owner, repo, 'assets/icon.jpg', defaultIconPath)
    appleTouchIconPath = await getIconUrl(
      octokit,
      owner,
      repo,
      'assets/icon-144.jpg',
      defaultAppleTouchIconPath
    )
  }

  return { iconPath, appleTouchIconPath }
}

async function getIconUrl(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  defaultPath: string
): Promise<string> {
  try {
    await octokit.repos.getContent({ owner, repo, path })
    return `https://github.com/${owner}/${repo}/blob/main/${path}?raw=true`
  } catch (error) {
    console.warn(`No icon found in ${path}, using default:`, defaultPath)
    return defaultPath
  }
}
