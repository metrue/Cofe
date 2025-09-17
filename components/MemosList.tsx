"use client";

import "katex/dist/katex.min.css";

import { useEffect, useState } from "react";

import { Memo } from "@/lib/types";
import { MemoCard } from "./MemoCard"; // Import MemoCard from MemosList
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
  const [deletingMemoId, setDeletingMemoId] = useState<string | null>(null);

  useEffect(() => {
    const formatted = memos.map((memo) => ({
      ...memo,
      formattedTimestamp: formatTimestamp(memo.timestamp),
    }));
    setFormattedMemos(formatted);
  }, [memos]);

  const handleDelete = async (id: string) => {
    try {
      setDeletingMemoId(id);

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation DeleteMemo($id: String!) {
              deleteMemo(id: $id)
            }
          `,
          variables: { id },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (!response.ok) {
        throw new Error('Failed to delete memo')
      }

      setFormattedMemos((preMemos) => preMemos.filter((memo) => memo.id !== id))
    } catch (e) {
      console.error(`error delete memo: ${e}`)
    } finally {
      setDeletingMemoId(null);
    }
  }


  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {formattedMemos.filter((_, index) => index % 2 !== 0).map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              onDelete={handleDelete}
              onEdit={() => {}}
              isDeleting={deletingMemoId === memo.id}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {memos.filter((_, index) => index % 2 === 0).map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              onDelete={handleDelete}
              onEdit={() => {}}
              isDeleting={deletingMemoId === memo.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
