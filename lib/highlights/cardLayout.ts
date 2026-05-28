/**
 * Constraint solver for Google Docs-style comment cards.
 *
 * Each card has a "preferred top" (its anchor's vertical position in the
 * article) and a measured height. The solver walks them in preferred-top
 * order and pushes overlapping cards down so adjacent cards never collide.
 *
 * Pure function — easy to unit-test, easy to inline in `<CommentRail>` via
 * a hook.
 */

export interface CardSpec {
  id: string
  desiredTop: number
  height: number
}

export function solveCardLayout(specs: readonly CardSpec[], gap = 8): Map<string, number> {
  const sorted = [...specs].sort((a, b) => a.desiredTop - b.desiredTop)
  const tops = new Map<string, number>()
  let stackTop = 0
  for (const spec of sorted) {
    const top = Math.max(spec.desiredTop, stackTop)
    tops.set(spec.id, top)
    stackTop = top + spec.height + gap
  }
  return tops
}
