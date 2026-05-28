/**
 * Client-side API for inline highlights. Thin wrapper over fetch with
 * `ApiResponse<T>` envelope handling.
 */

import {
  Highlight,
  InlineComment,
  PostHighlights,
  Reactions,
} from './schema'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = (await res.json()) as ApiResponse<T>
  if (!res.ok || !body.success || body.data === undefined) {
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  return body.data
}

export interface HighlightsLoadResponse extends PostHighlights {
  currentFingerprint: string
  isOwner: boolean
}

export async function fetchHighlights(postId: string): Promise<HighlightsLoadResponse> {
  return request<HighlightsLoadResponse>(`/api/blog/${encodeURIComponent(postId)}/highlights`)
}

export async function createHighlight(
  postId: string,
  payload: {
    anchor: Highlight['anchor']
    body: string
    authorName?: string | null
  },
): Promise<{ highlight: Highlight }> {
  return request(`/api/blog/${encodeURIComponent(postId)}/highlights`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createReply(
  postId: string,
  highlightId: string,
  payload: { parentId?: string | null; body: string; authorName?: string | null },
): Promise<{ comment: InlineComment }> {
  return request(
    `/api/blog/${encodeURIComponent(postId)}/highlights/${encodeURIComponent(highlightId)}/replies`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export async function toggleReaction(
  postId: string,
  highlightId: string,
  commentId: string,
  emoji: string,
): Promise<{ reactions: Reactions }> {
  return request(
    `/api/blog/${encodeURIComponent(postId)}/highlights/${encodeURIComponent(highlightId)}/comments/${encodeURIComponent(commentId)}/reactions`,
    { method: 'POST', body: JSON.stringify({ emoji }) },
  )
}

export async function setHighlightResolved(
  postId: string,
  highlightId: string,
  resolved: boolean,
): Promise<{ highlight: Highlight }> {
  return request(
    `/api/blog/${encodeURIComponent(postId)}/highlights/${encodeURIComponent(highlightId)}/resolve`,
    { method: 'POST', body: JSON.stringify({ resolved }) },
  )
}

export async function deleteHighlight(
  postId: string,
  highlightId: string,
): Promise<{ ok: boolean }> {
  return request(
    `/api/blog/${encodeURIComponent(postId)}/highlights/${encodeURIComponent(highlightId)}`,
    { method: 'DELETE' },
  )
}

export async function deleteComment(
  postId: string,
  highlightId: string,
  commentId: string,
): Promise<{ ok: boolean; removedHighlight?: boolean }> {
  return request(
    `/api/blog/${encodeURIComponent(postId)}/highlights/${encodeURIComponent(highlightId)}/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
  )
}
