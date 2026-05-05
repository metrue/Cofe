"use client";

import "katex/dist/katex.min.css";

import { useEffect, useState } from "react";
import Masonry from "react-masonry-css";

import { Memo } from "@/lib/types";
import { MemoCard } from "./MemoCard";
import { formatTimestamp } from "@/lib/utils";

type FormattedMemo = Memo & { formattedTimestamp: string };

const breakpointColumns = {
  default: 2,
  768: 1, // single column under md breakpoint
};

export default function PublicMemosList({
  memos,
}: {
  memos: Memo[];
}) {
  const [formattedMemos, setFormattedMemos] = useState<FormattedMemo[]>([]);
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


  if (formattedMemos.length === 0) {
    return (
      <div className='flex flex-col items-center mt-16 space-y-6'>
        <div className='text-center space-y-3'>
          <h2 className='text-2xl font-semibold text-gray-900'>No memos yet</h2>
          <p className='text-gray-500 max-w-md'>Capture quick thoughts and moments by creating your first memo.</p>
        </div>
      </div>
    )
  }

  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className="memos-masonry"
      columnClassName="memos-masonry-col"
    >
      {formattedMemos.map((memo) => (
        <div key={memo.id} className="mb-4">
          <MemoCard
            memo={memo}
            onDelete={handleDelete}
            onEdit={() => { }}
            isDeleting={deletingMemoId === memo.id}
          />
        </div>
      ))}
    </Masonry>
  );
}
