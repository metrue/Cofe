import BlogList from "@/components/BlogList";
import { authOptions } from "@/lib/auth";
import { createOptimizedGitHubClient } from '@/lib/client'
import { getServerSession } from "next-auth/next";

export const revalidate = 60;

export default async function BlogPage() {
  const session = await getServerSession(authOptions);

  const username = process.env.GITHUB_USERNAME ?? '';
  const client = createOptimizedGitHubClient(username, session?.accessToken);

  try {
    const posts = await client.getBlogPosts();
    return <BlogList posts={posts} />;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return (
      <div className="error-message">
        An error occurred while fetching blog posts: {(error as Error).message}
      </div>
    );
  }
}
