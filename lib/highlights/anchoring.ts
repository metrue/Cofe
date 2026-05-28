/**
 * Range ↔ HighlightAnchor conversion.
 *
 * Anchoring strategy is a simplified W3C Web Annotation:
 *   - TextPositionSelector (startOffset/endOffset) for the fast path
 *   - TextQuoteSelector (prefix/exact/suffix) for the resilient path
 *   - Final fallback: bare exact text (may resolve to wrong occurrence
 *     if duplicated, so prefix/suffix are the primary disambiguator)
 *
 * All offsets are character offsets within `articleEl.textContent`. The same
 * text-collection rule applies to capture and restore, so DOM structure
 * changes (e.g. wrapping a span) don't break the anchor as long as the text
 * content matches.
 */

import type { HighlightAnchor } from './schema'

const CONTEXT_WINDOW = 32

/**
 * Build a `HighlightAnchor` from a live DOM `Range` inside `articleEl`.
 *
 * Returns `null` when the range is collapsed, lies outside the article, or
 * cannot be resolved into char offsets.
 */
export function rangeToAnchor(range: Range, articleEl: HTMLElement): HighlightAnchor | null {
  if (range.collapsed) return null

  if (!articleEl.contains(range.startContainer) || !articleEl.contains(range.endContainer)) {
    return null
  }

  const articleText = articleEl.textContent ?? ''
  if (articleText.length === 0) return null

  const startOffset = computeOffset(articleEl, range.startContainer, range.startOffset)
  const endOffset = computeOffset(articleEl, range.endContainer, range.endOffset)
  if (startOffset < 0 || endOffset < 0 || endOffset <= startOffset) return null

  const exact = articleText.slice(startOffset, endOffset)
  if (exact.length === 0) return null

  const prefix = articleText.slice(Math.max(0, startOffset - CONTEXT_WINDOW), startOffset)
  const suffix = articleText.slice(endOffset, Math.min(articleText.length, endOffset + CONTEXT_WINDOW))

  return { startOffset, endOffset, exact, prefix, suffix }
}

/**
 * Resolve a `HighlightAnchor` against `articleEl` and return a live `Range`.
 *
 * Strategy:
 *   1. Fast path — if the anchor's offsets still slice to `exact`, use them.
 *   2. Resilient path — search for `prefix + exact + suffix` and offset back.
 *   3. Last resort — search for `exact` alone.
 *   4. Otherwise — return `null` (caller treats as orphaned).
 */
export function anchorToRange(anchor: HighlightAnchor, articleEl: HTMLElement): Range | null {
  const articleText = articleEl.textContent ?? ''
  if (articleText.length === 0) return null

  // 1. Fast path
  if (
    anchor.startOffset >= 0 &&
    anchor.endOffset <= articleText.length &&
    articleText.slice(anchor.startOffset, anchor.endOffset) === anchor.exact
  ) {
    return rangeFromOffsets(articleEl, anchor.startOffset, anchor.endOffset)
  }

  // 2. Resilient path — combined prefix + exact + suffix
  if (anchor.prefix.length > 0 || anchor.suffix.length > 0) {
    const needle = anchor.prefix + anchor.exact + anchor.suffix
    const idx = articleText.indexOf(needle)
    if (idx >= 0) {
      const start = idx + anchor.prefix.length
      return rangeFromOffsets(articleEl, start, start + anchor.exact.length)
    }
  }

  // 3. Last resort — exact alone (first occurrence)
  if (anchor.exact.length > 0) {
    const idx = articleText.indexOf(anchor.exact)
    if (idx >= 0) {
      return rangeFromOffsets(articleEl, idx, idx + anchor.exact.length)
    }
  }

  // 4. Orphaned
  return null
}

/**
 * Walk `root` (text nodes only) accumulating character lengths until we reach
 * the (`node`, `nodeOffset`) boundary. Returns the cumulative offset within
 * `root.textContent`, or -1 if the boundary can't be located.
 *
 * Handles two cases:
 *   - `node` is a text node — accumulate up to `node`, then add `nodeOffset`.
 *   - `node` is an element — accumulate text length of the element's
 *     children up to index `nodeOffset`, then add their text length to the
 *     cumulative offset that lands on the element.
 */
function computeOffset(root: HTMLElement, node: Node, nodeOffset: number): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return offsetToTextNode(root, node, nodeOffset)
  }

  if (node === root) {
    // Range boundary on the article element itself: nodeOffset indexes children.
    return offsetThroughChildren(root, root, nodeOffset)
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return offsetThroughChildren(root, node as Element, nodeOffset)
  }

  return -1
}

/** Offset within `root.textContent` of `(textNode, charOffsetWithinNode)`. */
function offsetToTextNode(root: HTMLElement, textNode: Node, charOffsetWithinNode: number): number {
  const ownerDoc = root.ownerDocument
  if (!ownerDoc) return -1

  let offset = 0
  const walker = ownerDoc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let current: Node | null = walker.nextNode()
  while (current) {
    if (current === textNode) {
      const len = current.textContent?.length ?? 0
      return offset + Math.min(charOffsetWithinNode, len)
    }
    offset += current.textContent?.length ?? 0
    current = walker.nextNode()
  }
  return -1
}

/**
 * Offset within `root.textContent` of "the boundary right before child #
 * `childIndex` of `el`". Used when a Range boundary lands on an Element
 * rather than a text node.
 */
function offsetThroughChildren(root: HTMLElement, el: Element, childIndex: number): number {
  // Sum text length of el's first `childIndex` children.
  let internalLen = 0
  for (let i = 0; i < childIndex && i < el.childNodes.length; i++) {
    internalLen += el.childNodes[i].textContent?.length ?? 0
  }

  if (el === root) {
    // Boundary is at root level — we're done, internalLen IS the offset.
    return internalLen
  }

  // Otherwise we need cumulative offset up to `el`, then add `internalLen`.
  const ownerDoc = root.ownerDocument
  if (!ownerDoc) return -1

  let offset = 0
  const walker = ownerDoc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let current: Node | null = walker.nextNode()
  while (current) {
    if (current === el) {
      return offset + internalLen
    }
    if (current.nodeType === Node.TEXT_NODE) {
      offset += current.textContent?.length ?? 0
    }
    current = walker.nextNode()
  }
  return -1
}

/** Build a `Range` covering `[start, end)` char offsets within `root.textContent`. */
function rangeFromOffsets(root: HTMLElement, start: number, end: number): Range | null {
  const ownerDoc = root.ownerDocument
  if (!ownerDoc) return null
  if (start < 0 || end < start) return null

  const range = ownerDoc.createRange()
  let cursor = 0
  let startSet = false
  let endSet = false

  const walker = ownerDoc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    const len = node.textContent?.length ?? 0
    const nodeStart = cursor
    const nodeEnd = cursor + len

    if (!startSet && start >= nodeStart && start <= nodeEnd) {
      range.setStart(node, start - nodeStart)
      startSet = true
    }
    if (!endSet && end >= nodeStart && end <= nodeEnd) {
      range.setEnd(node, end - nodeStart)
      endSet = true
    }
    if (startSet && endSet) return range

    cursor = nodeEnd
    node = walker.nextNode()
  }

  return startSet && endSet ? range : null
}
