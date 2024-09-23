"use client";

import { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";
import { BlogPost, getBlogPostsPublic } from "@/lib/githubApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

function decodeContent(content: string): string {
  try {
    return decodeURIComponent(content);
  } catch (error) {
    console.error("Error decoding content:", error);
    return content;
  }
}

function removeFrontmatter(content: string): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  return content.replace(frontmatterRegex, "");
}

export default function PublicBlogPost({
  params,
}: {
  params: { username: string; id: string };
}) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { username, id } = params;

  useEffect(() => {
    const fetchPost = async () => {
      const octokit = new Octokit();
      try {
        const posts = await getBlogPostsPublic(
          octokit,
          username,
          "tinymind-blog"
        );
        const foundPost = posts.find((p) => p.id === decodeURIComponent(id));
        setPost(foundPost || null);
      } catch (error) {
        console.error("Error fetching blog post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [username, id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <AiOutlineLoading3Quarters className="animate-spin text-4xl" />
      </div>
    );
  }

  if (!post) {
    return <div>Blog post not found</div>;
  }

  const decodedTitle = decodeContent(post.title);
  const decodedContent = decodeContent(post.content);
  const contentWithoutFrontmatter = removeFrontmatter(decodedContent);

  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">{decodedTitle}</CardTitle>
        <p className="text-sm text-gray-500">
          {format(new Date(post.date), "MMMM d, yyyy")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({
                inline,
                className,
                children,
                ...props
              }: {
                inline?: boolean;
                className?: string;
                children?: React.ReactNode;
              } & React.HTMLAttributes<HTMLElement>) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow as { [key: string]: React.CSSProperties }}
                    language={match[1]}
                    PreTag="div"
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              a: ({ ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {contentWithoutFrontmatter}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
