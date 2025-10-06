import BlogList from "@/components/BlogList";
import { createSmartClient } from '@/lib/smartClient'

export const revalidate = process.env.NODE_ENV === 'development' ? 0 : 60;

export default async function BlogPage() {
  // No authentication needed for viewing blog posts
  const client = createSmartClient();

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
