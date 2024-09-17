"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { FaGithub } from "react-icons/fa"; // Change this import

export default function Header() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(
    pathname === "/blog" ? "blog" : "thoughts"
  );

  return (
    <header className="fixed top-0 left-0 right-0 py-4 bg-card shadow z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <Button
              variant="ghost"
              className={`text-lg font-light ${
                activeTab === "blog" ? "text-black" : "text-gray-500"
              }`}
              onClick={() => setActiveTab("blog")}
              asChild
            >
              <Link href="/blog">Blog</Link>
            </Button>
            <Button
              variant="ghost"
              className={`text-lg font-light ${
                activeTab === "thoughts" ? "text-black" : "text-gray-300"
              }`}
              onClick={() => setActiveTab("thoughts")}
              asChild
            >
              <Link href="/thoughts">Thoughts</Link>
            </Button>
          </div>
          <Link
            href="https://github.com/mazzzystar/tinymind"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black hover:text-gray-500"
          >
            <FaGithub size={24} />
          </Link>
        </div>
      </div>
    </header>
  );
}
