"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname, useSearchParams } from "next/navigation";
import { FaGithub } from "react-icons/fa"; // Change this import
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Header({ username, iconUrl }: { username?: string, iconUrl?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("HomePage");

  const isUserPage = !!username;

  // Determine the active tab based on the current pathname and search params
  const activeTab = isUserPage
    ? pathname.includes("/thoughts")
      ? "thoughts"
      : "blog"
    : pathname.startsWith("/blog") || searchParams.get("type") === "blog"
    ? "blog"
    : pathname.startsWith("/thoughts") || searchParams.get("type") === "thought"
    ? "thoughts"
    : "thoughts";

  return (
    <header className="fixed top-0 left-0 right-0 py-4 bg-card shadow z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="">
            <Image src={iconUrl ?? '/icon.jpg'} alt="Home" width={32} height={32} className="rounded-full" />
          </Link>
          <div className="flex-grow flex justify-center">
            <div className="flex space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                className={`text-lg font-normal ${
                  activeTab === "blog" ? "text-black" : "text-gray-300"
                }`}
                asChild
              >
                <Link href={isUserPage ? `/${username}/blog` : "/blog"}>
                  {t("blog")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className={`text-lg font-normal ${
                  activeTab === "thoughts" ? "text-black" : "text-gray-300"
                }`}
                asChild
              >
                <Link href={isUserPage ? `/${username}/thoughts` : "/thoughts"}>
                  {t("thoughts")}
                </Link>
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
