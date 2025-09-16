"use client";

import "katex/dist/katex.min.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ExternalDiscussion } from "discussing";

import { Button } from "@/components/ui/button";
import { CgImage } from "react-icons/cg";
import { GrInfo } from "react-icons/gr";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "react-tooltip";
import { createGitHubAPIClient } from "@/lib/client"
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { uploadImage } from "@/lib/githubApi";
import { useDropzone } from "react-dropzone";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

function removeFrontmatter(content: string): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  return content.replace(frontmatterRegex, "");
}

export default function Editor({
  defaultType = "memo",
}: {
  defaultType?: "memo" | "blog";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState(
    (searchParams.get("type") as "memo" | "blog") || defaultType
  );
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const t = useTranslations("HomePage");
  const { data: session } = useSession();
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const { toast } = useToast();
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [discussions, setDiscussions] = useState<ExternalDiscussion[]>([]);

  const fetchMemo = useCallback(
    async (id: string) => {
      if (!session?.accessToken) return;
      try {
        const memos = await createGitHubAPIClient(session.accessToken).getMemos()
        const memo = memos.find((t) => t.id === id);
        if (memo) {
          setContent(memo.content);
        }
      } catch (error) {
        console.error("Error fetching memo:", error);
      }
    },
    [session?.accessToken]
  );

  const fetchBlogPost = useCallback(
    async (id: string) => {
      if (!session?.accessToken) return;
      try {
        const response = await fetch(`/api/github?action=getBlogPost&id=${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch blog post");
        }
        const blogPost = await response.json();
        setTitle(blogPost.title);
        setContent(removeFrontmatter(blogPost.content));
        setDiscussions(blogPost.discussions || []);
        setEditingMemoId(id);
      } catch (error) {
        console.error("Error fetching blog post:", error);
      }
    },
    [session?.accessToken]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("type", type);
    router.push(`/editor?${params.toString()}`);

    const id = searchParams.get("id");

    if (id) {
      setEditingMemoId(id);
      if (type === "blog") {
        fetchBlogPost(id);
      } else if (type === "memo") {
        fetchMemo(id);
      }
    }
  }, [type, router, searchParams, fetchMemo, fetchBlogPost]);

  const handleTypeChange = (value: "blog" | "memo") => {
    setType(value);
    if (value === "blog") {
      setEditingMemoId(null);
    } else {
      setDiscussions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccess(false);
    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action:
            type === "blog"
              ? editingMemoId
                ? "updateBlogPost"
                : "createBlogPost"
              : editingMemoId
              ? "updateMemo"
              : "createMemo",
          id: editingMemoId,
          title,
          content,
          discussions: type === "blog" ? discussions : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(t("failedPublish"));
      }

      setIsSuccess(true);
      toast({
        title: t("success"),
        description: editingMemoId
          ? `${type === "blog" ? t("blogPostUpdated") : t("memoUpdated")}`
          : `${type === "blog" ? t("blogPostCreated") : t("memoCreated")}`,
        duration: 3000,
      });
      setTimeout(() => {
        if (type === "blog") {
          router.push("/blog");
        } else {
          router.push("/memos");
        }
      }, 2000);
    } catch (error) {
      console.error("Error publishing:", error);
      toast({
        title: t("error"),
        description: t("failedPublish"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!session?.accessToken) {
        toast({
          title: t("error"),
          description: t("notAuthenticated"),
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      setIsImageUploading(true);
      try {
        const imageUrl = await uploadImage(file, session.accessToken);
        const imageMarkdown = `![${file.name}](${imageUrl})`;

        if (cursorPosition !== null) {
          const newContent =
            content.slice(0, cursorPosition) +
            imageMarkdown +
            content.slice(cursorPosition);
          setContent(newContent);
        } else {
          setContent((prevContent) => prevContent + "\n\n" + imageMarkdown);
        }

        toast({
          title: t("success"),
          description: t("imageUploaded"),
          duration: 3000,
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({
          title: t("error"),
          description: t("imageUploadFailed"),
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setIsImageUploading(false);
      }
    },
    [session?.accessToken, cursorPosition, content, toast, t]
  );

  const addDiscussion = () => {
    setDiscussions([...discussions, { platform: 'v2ex', url: '' }]);
  };

  const removeDiscussion = (index: number) => {
    setDiscussions(discussions.filter((_, i) => i !== index));
  };

  const updateDiscussion = (index: number, field: keyof ExternalDiscussion, value: string) => {
    const updated = discussions.map((discussion, i) => 
      i === index ? { ...discussion, [field]: value } : discussion
    );
    setDiscussions(updated);
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        if (file.type.startsWith("image/")) {
          await handleImageUpload(file);
        } else {
          toast({
            title: t("error"),
            description: t("onlyImagesAllowed"),
            variant: "default",
            duration: 3000,
          });
        }
      }
    },
    [handleImageUpload, toast, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/*": [],
    },
  });

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      if (!session?.accessToken) {
        toast({
          title: t("error"),
          description: t("notAuthenticated"),
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      const items = Array.from(e.clipboardData.items);
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          setIsImageUploading(true);

          try {
            const file = item.getAsFile();
            if (!file) continue;

            const imageUrl = await uploadImage(file, session.accessToken);
            const imageMarkdown = `![${
              file.name || "Pasted image"
            }](${imageUrl})`;

            if (cursorPosition !== null) {
              const newContent =
                content.slice(0, cursorPosition) +
                imageMarkdown +
                content.slice(cursorPosition);
              setContent(newContent);
            } else {
              setContent((prevContent) => prevContent + "\n\n" + imageMarkdown);
            }

            toast({
              title: t("success"),
              description: t("imageUploaded"),
              duration: 3000,
            });
          } catch (error) {
            console.error("Error uploading pasted image:", error);
            toast({
              title: t("error"),
              description: t("imageUploadFailed"),
              variant: "destructive",
              duration: 3000,
            });
          } finally {
            setIsImageUploading(false);
          }
        }
      }
    },
    [session?.accessToken, cursorPosition, content, toast, t]
  );

  return (
    <Card className="max-w-2xl mx-auto shadow-md border border-gray-100 relative">
      {(isLoading || isImageUploading) && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      )}
      <CardHeader className="border-b border-gray-100 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex flex-col items-start">
            {type === "blog" ? t("createBlogPost") : t("createMemo")}
            <span className="mt-2 text-xs font-normal text-gray-400 flex items-center">
              <span className="text-gray-400">{t("publicContentWarning")}</span>
              <GrInfo
                className="m-1 cursor-pointer text-black"
                data-tooltip-id="public-content-tooltip"
              />
              <Tooltip id="public-content-tooltip" place="top">
                {t("publicContentTooltip")}
              </Tooltip>
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup
            value={type}
            onValueChange={handleTypeChange}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="blog"
                id="blog"
                className={type === "blog" ? "text-white bg-black" : ""}
              />
              <Label htmlFor="blog" className="text-sm">
                {t("blog")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="memo"
                id="memo"
                className={type === "memo" ? "text-white bg-black" : ""}
              />
              <Label htmlFor="memo" className="text-sm">
                {t("memos")}
              </Label>
            </div>
          </RadioGroup>

          {type === "blog" && (
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("enterTitle")}
              required
              className="border-gray-200 focus:border-gray-300 focus:ring-gray-300"
              disabled={isLoading || isImageUploading}
            />
          )}

          {type === "blog" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("externalDiscussions")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDiscussion}
                  disabled={isLoading || isImageUploading}
                >
                  {t("addDiscussion")}
                </Button>
              </div>
              {discussions.map((discussion, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={discussion.platform}
                    onChange={(e) => updateDiscussion(index, 'platform', e.target.value as ExternalDiscussion['platform'])}
                    className="px-3 py-2 border border-gray-200 rounded-md focus:border-gray-300 focus:ring-gray-300"
                    disabled={isLoading || isImageUploading}
                  >
                    <option value="v2ex">V2EX</option>
                    <option value="reddit">Reddit</option>
                    <option value="hackernews">Hacker News</option>
                  </select>
                  <Input
                    type="url"
                    value={discussion.url}
                    onChange={(e) => updateDiscussion(index, 'url', e.target.value)}
                    placeholder={t("enterDiscussionUrl")}
                    className="flex-1 border-gray-200 focus:border-gray-300 focus:ring-gray-300"
                    disabled={isLoading || isImageUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDiscussion(index)}
                    disabled={isLoading || isImageUploading}
                    className="text-red-600 hover:text-red-700"
                  >
                    {t("remove")}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border rounded-md relative" {...getRootProps()}>
            <input {...getInputProps()} />
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setIsPreview(false)}
                className={`text-sm px-4 py-2 ${
                  !isPreview ? "bg-gray-100" : ""
                }`}
                disabled={isLoading || isImageUploading}
              >
                {t("write")}
              </button>
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className={`text-sm px-4 py-2 ${
                  isPreview ? "bg-gray-100 border-b-2 border-black" : ""
                }`}
                disabled={isLoading || isImageUploading}
              >
                {t("preview")}
              </button>
              <label
                htmlFor="image-upload"
                className="text-sm px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                <CgImage className="h-5 w-5" />
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageUpload(e.target.files[0]);
                    }
                  }}
                  disabled={isLoading || isImageUploading}
                />
              </label>
            </div>
            {isPreview ? (
              <div className="p-4 prose max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
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
                          style={
                            tomorrow as { [key: string]: React.CSSProperties }
                          }
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
                    a: ({ children, ...props }) => (
                      <a
                        {...props}
                        className="text-gray-400 no-underline hover:text-gray-600 hover:underline hover:underline-offset-4 transition-colors duration-200 break-words"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    blockquote: ({ children }) => (
                      <div className="pl-4 border-l-4 border-gray-200 text-gray-400">
                        {children}
                      </div>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={(e) =>
                  setCursorPosition(e.currentTarget.selectionStart)
                }
                onPaste={handlePaste}
                placeholder={t("writeContent")}
                className="min-h-[300px] border-0 focus:ring-0"
                required
                disabled={isLoading || isImageUploading}
              />
            )}
            {isDragActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                <p className="text-lg font-semibold">{t("dropImageHere")}</p>
              </div>
            )}
          </div>

          {isSuccess && (
            <div className="text-xs font-normal text-gray-400 text-center m-2">
              {t("successPublished")}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={isLoading || isImageUploading}
              className="px-12 py-5 bg-black hover:bg-gray-800 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("publishing")}
                </>
              ) : (
                t("publish")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
