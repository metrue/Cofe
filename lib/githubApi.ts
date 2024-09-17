import { Octokit } from '@octokit/rest'

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  date: string;
}

export type Thought = {
  id: string
  content: string
  timestamp: string
  image?: string
}

function getOctokit(accessToken: string | undefined) {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  return new Octokit({ auth: accessToken });
}

async function getRepoInfo(accessToken: string | undefined) {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    return {
      owner: user.login,
      repo: 'tinymind-blog' // You might want to make this configurable
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    throw new Error('Failed to get authenticated user');
  }
}

async function ensureRepoExists(octokit: Octokit, owner: string, repo: string) {
  try {
    await octokit.repos.get({ owner, repo })
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      await octokit.repos.createForAuthenticatedUser({
        name: repo,
        auto_init: true,
      })
      console.log(`Created new repository: ${repo}`)

      // Add "https://tinymind.me" to README.md
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'README.md',
        message: 'Add TinyMind link to README',
        content: Buffer.from('Write blog posts and thoughts at https://tinymind.me\n').toString('base64'),
      })
      console.log('Added TinyMind link to README.md')
    } else {
      throw error
    }
  }
}

async function ensureContentStructure(octokit: Octokit, owner: string, repo: string) {
  async function createFileIfNotExists(octokit: Octokit, owner: string, repo: string, path: string, message: string, content: string) {
    try {
      await octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      console.log(`File ${path} already exists.`);
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        console.log(`Creating file ${path}...`);
        try {
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: Buffer.from(content).toString('base64'), // Encode content to Base64
          });
          console.log(`File ${path} created successfully.`);
        } catch (createError) {
          console.error(`Error creating file ${path}:`, createError);
          throw createError;
        }
      } else {
        console.error(`Error checking file ${path}:`, error);
        throw error;
      }
    }
  }

  try {
    await createFileIfNotExists(octokit, owner, repo, 'content/.gitkeep', 'Initialize content directory', '');
    await createFileIfNotExists(octokit, owner, repo, 'content/blog/.gitkeep', 'Initialize blog directory', '');
    await createFileIfNotExists(octokit, owner, repo, 'content/thoughts.json', 'Initialize thoughts.json', '[]');
  } catch (error) {
    console.error('Error ensuring content structure:', error);
    throw error;
  }
}

async function initializeGitHubStructure(octokit: Octokit, owner: string, repo: string) {
  await ensureRepoExists(octokit, owner, repo)
  await ensureContentStructure(octokit, owner, repo)
}

export async function getBlogPosts(accessToken: string): Promise<BlogPost[]> {
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  await initializeGitHubStructure(octokit, owner, repo);

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/blog',
    });

    console.log('GitHub API response:', response);

    if (!Array.isArray(response.data)) {
      console.warn('Unexpected response from GitHub API: data is not an array');
      return [];
    }

    const posts = await Promise.all(
      response.data
        .filter(file => file.type === 'file' && file.name !== '.gitkeep' && file.name.endsWith('.md'))
        .map(async (file) => {
          try {
            const contentResponse = await octokit.repos.getContent({
              owner,
              repo,
              path: `content/blog/${file.name}`,
            });

            if ('content' in contentResponse.data) {
              const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');
              
              // Parse the date from the content
              const dateMatch = content.match(/date:\s*(.+)/);
              const date = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

              // Parse the title from the content
              const titleMatch = content.match(/title:\s*(.+)/);
              const title = titleMatch ? titleMatch[1] : file.name.replace('.md', '');

              return {
                id: file.name.replace('.md', ''),
                title,
                content,
                date,
              };
            }
          } catch (error) {
            console.error(`Error fetching content for ${file.name}:`, error);
          }
        })
    );

    const filteredPosts = posts.filter((post): post is BlogPost => post !== undefined);
    console.log('Filtered posts:', filteredPosts);
    return filteredPosts;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw error;
  }
}

export async function getBlogPost(id: string, accessToken: string): Promise<BlogPost | null> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  await initializeGitHubStructure(octokit, owner, repo);

  try {
    // Fetch the file content
    const contentResponse = await octokit.repos.getContent({
      owner,
      repo,
      path: `content/blog/${id}.md`,
    });

    if (Array.isArray(contentResponse.data) || !('content' in contentResponse.data)) {
      throw new Error('Unexpected response from GitHub API');
    }

    const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');

    // Fetch the latest commit for this file
    const commitResponse = await octokit.repos.listCommits({
      owner,
      repo,
      path: `content/blog/${id}.md`,
      per_page: 1
    });

    if (commitResponse.data.length === 0) {
      throw new Error('No commits found for this file');
    }

    const latestCommit = commitResponse.data[0];

    return {
      id,
      title: id,
      content,
      date: latestCommit.commit.author?.date ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

export async function getThoughts(accessToken: string | undefined): Promise<Thought[]> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/thoughts.json',
    })

    if (Array.isArray(response.data) || !('content' in response.data)) {
      throw new Error('Unexpected response from GitHub API')
    }

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
    const thoughts = JSON.parse(content) as Thought[]

    return thoughts
  } catch (error) {
    console.error('Error fetching thoughts:', error)
    throw error
  }
}

export async function createBlogPost(title: string, content: string, accessToken: string): Promise<void> {
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  await initializeGitHubStructure(octokit, owner, repo);

  const path = `content/blog/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}.md`
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

export async function createThought(content: string, image: string | undefined, accessToken: string): Promise<void> {
  console.log('Creating thought...');
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  console.log('Octokit instance created');
  
  try {
    const { owner, repo } = await getRepoInfo(accessToken);
    console.log('Repo info:', { owner, repo });

    await initializeGitHubStructure(octokit, owner, repo);
    console.log('GitHub structure initialized');

    let thoughts: Thought[] = [];
    let existingSha: string | undefined;

    // Try to fetch existing thoughts
    try {
      console.log('Fetching existing thoughts...');
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: 'content/thoughts.json',
      });

      if (!Array.isArray(response.data) && 'content' in response.data) {
        const existingContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
        thoughts = JSON.parse(existingContent) as Thought[];
        existingSha = response.data.sha;
        console.log('Existing thoughts fetched');
      }
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        console.log('thoughts.json does not exist, creating a new file');
      } else {
        console.error('Error fetching existing thoughts:', error);
        throw error;
      }
    }

    // Create new thought
    const newThought: Thought = {
      id: Date.now().toString(),
      content,
      timestamp: new Date().toISOString(),
      image,
    };

    // Add new thought to the beginning of the array
    thoughts.unshift(newThought);

    console.log('Updating thoughts file...');
    // Create or update the file with all thoughts
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'content/thoughts.json',
      message: 'Add new thought',
      content: Buffer.from(JSON.stringify(thoughts, null, 2)).toString('base64'),
      sha: existingSha,
    });

    console.log('Thought created successfully');
  } catch (error) {
    console.error('Error creating thought:', error);
    throw error;
  }
}

export async function getUserLogin(accessToken: string): Promise<string> {
  const octokit = getOctokit(accessToken);
  const { data: user } = await octokit.users.getAuthenticated();
  return user.login;
}