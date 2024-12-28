"use client";

import "katex/dist/katex.min.css";

import { useEffect, useState } from "react";

import { Memo } from "@/lib/types";
import { MemoCard } from "./MemosList"; // Import MemoCard from MemosList
import { formatTimestamp } from "@/lib/utils";

type FormattedMemo = Memo & { formattedTimestamp: string };

export default function PublicMemosList({
  memos,
}: {
  memos: Memo[];
}) {
  const [formattedMemos, setFormattedMemos] = useState<
    FormattedMemo[]
  >([]);

  useEffect(() => {
    const formatted = memos.map((thought) => ({
      ...thought,
      formattedTimestamp: formatTimestamp(thought.timestamp),
    }));
    setFormattedMemos(formatted);
  }, [memos]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {formattedMemos.filter((_, index) => index % 2 !== 0).map((thought) => (
            <MemoCard
              key={thought.id}
              thought={thought}
              onDelete={() => {}}
              onEdit={() => {}}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {memos.filter((_, index) => index % 2 === 0).map((thought) => (
            <MemoCard
              key={thought.id}
              thought={thought}
              onDelete={() => {}}
              onEdit={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
