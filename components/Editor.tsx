"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react"; // Import Loader2 icon
import { useTranslations } from "next-intl";

export default function Editor() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("thought");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const t = useTranslations("HomePage");

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
          action: type === "blog" ? "createBlogPost" : "createThought",
          title,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(t("failedPublish"));
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000); // Redirect after 2 seconds
    } catch (error) {
      console.error("Error publishing:", error);
      alert(t("failedPublish"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-md border border-gray-100">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex flex-col items-start">
            {type === "blog" ? t("createBlogPost") : t("createThought")}
            <span className="mt-1 text-xs font-normal text-gray-400">
              {t("publicContentWarning")}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup
            defaultValue={type}
            onValueChange={(value) => setType(value)}
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
                value="thought"
                id="thought"
                className={type === "thought" ? "text-white bg-black" : ""}
              />
              <Label htmlFor="thought" className="text-sm">
                {t("thoughts")}
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
            />
          )}

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("writeContent")}
            className="min-h-[300px] border-gray-100 focus:border-gray-200 focus:ring-gray-200"
            required
          />

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={isLoading}
              className="px-12 py-5 bg-black hover:bg-gray-800"
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

          {isSuccess && (
            <div className="text-green-500 text-center mt-4">
              {t("successPublished")}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
