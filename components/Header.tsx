"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { FaGithub } from "react-icons/fa"; // Change this import
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Header() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(
    pathname === "/blog" ? "blog" : "thoughts"
  );

  const t = useTranslations("HomePage");

  return (
    <header className="fixed top-0 left-0 right-0 py-4 bg-card shadow z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="">
            <Image src="/icon.jpg" alt="Home" width={32} height={32} />
          </Link>
          <div className="flex-grow flex justify-center">
            <div className="flex space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                className={`text-lg font-normal ${
                  activeTab === "blog" ? "text-black" : "text-gray-500"
                }`}
                onClick={() => setActiveTab("blog")}
                asChild
              >
                <Link href="/blog">{t("blog")}</Link>
              </Button>
              <Button
                variant="ghost"
                className={`text-lg font-normal ${
                  activeTab === "thoughts" ? "text-black" : "text-gray-300"
                }`}
                onClick={() => setActiveTab("thoughts")}
                asChild
              >
                <Link href="/thoughts">{t("thoughts")}</Link>
              </Button>
            </div>
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
