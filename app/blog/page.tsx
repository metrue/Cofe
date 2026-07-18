import BlogList from "@/components/BlogList";
import { getProvider } from '@/lib/runtime/provider'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const revalidate = 0; // Force fresh data fetch to fix cached empty state

export default async function BlogPage() {
  const session = await getServerSession(authOptions);
  const client = getProvider(session?.accessToken);

  try {
    const posts = await client.getBlogPosts({ includeDrafts: client.canWrite() });
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
