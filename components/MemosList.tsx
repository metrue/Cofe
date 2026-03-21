"use client";

import "katex/dist/katex.min.css";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { Memo } from "@/lib/types";
import { MemoCard } from "./MemoCard";
import { formatTimestamp } from "@/lib/utils";

type FormattedMemo = Memo & { formattedTimestamp: string };

function MemosListInner({ memos }: { memos: Memo[] }) {
  const [formattedMemos, setFormattedMemos] = useState<FormattedMemo[]>([]);
  const [deletingMemoId, setDeletingMemoId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

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

  const filteredMemos = query.trim()
    ? formattedMemos.filter(
        (m) => m.content.toLowerCase().includes(query.toLowerCase())
      )
    : formattedMemos;

  return (
    <div className="space-y-4">
      <div className="columns-1 md:columns-2 gap-4">
        {filteredMemos.map((memo) => (
          <div key={memo.id} className="break-inside-avoid mb-4">
            <MemoCard
              memo={memo}
              onDelete={handleDelete}
              onEdit={() => {}}
              isDeleting={deletingMemoId === memo.id}
            />
          </div>
        ))}
      </div>
      {filteredMemos.length === 0 && query.trim() && (
        <p className="text-center text-gray-400 mt-8">No memos found for &quot;{query}&quot;</p>
      )}
    </div>
  );
}

export default function PublicMemosList({ memos }: { memos: Memo[] }) {
  return (
    <Suspense fallback={null}>
      <MemosListInner memos={memos} />
    </Suspense>
  );
}
