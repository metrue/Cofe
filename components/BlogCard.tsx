"use client";

import { BlogPost } from "@/lib/types";
import Link from "next/link";

export const BlogCard = ({ post }: { post: BlogPost }) => (
  <div className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
    {post.imageUrl && (
      <div 
        className="h-48 bg-gray-100 relative overflow-hidden"
        style={{
          backgroundImage: `url(${post.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      </div>
    )}
    <Link
      href={`/blog/${encodeURIComponent(post.id)}`}
      className="block p-6 h-full flex flex-col justify-between"
      aria-label={post.title}
    >
      <div className="space-y-4">
        <h3 className="font-semibold text-xl md:text-2xl text-gray-900 group-hover:text-blue-600 transition-colors duration-200 leading-tight">
          {post.title}
        </h3>
        <p className="text-sm text-gray-500">
          {formatDate(post.date)}
        </p>
      </div>
    </Link>
  </div>
);

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
}
