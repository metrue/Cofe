import  BlogList  from '@/components/BlogList'
import { createGitHubAPIClient } from '@/lib/client'

export const revalidate = 60;

export default async function BlogPage() {
  const token = process.env.GITHUB_TOKEN ?? ''
  const client = createGitHubAPIClient(token)
  const username = process.env.GITHUB_USERNAME ?? 'metrue'
  const posts = await client.getBlogPosts(username ?? '');
  return <BlogList posts={posts} />;
}
