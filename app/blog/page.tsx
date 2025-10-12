import BlogList from "@/components/BlogList";
import { createSmartClient } from '@/lib/smartClient'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const revalidate = 0; // Force fresh data fetch to fix cached empty state

export default async function BlogPage() {
  const session = await getServerSession(authOptions);
  const client = createSmartClient(session?.accessToken);

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
