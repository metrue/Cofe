/**
 * @jest-environment jsdom
 */

import {
  rangeToAnchor,
  anchorToRange,
} from '@/lib/highlights/anchoring'
import { HighlightAnchorSchema } from '@/lib/highlights/schema'

function makeArticle(html: string): HTMLElement {
  const article = document.createElement('article')
  article.innerHTML = html
  document.body.appendChild(article)
  return article
}

function cleanup() {
  document.body.innerHTML = ''
}

/**
 * Construct a Range covering [start, end) char offsets within `el.textContent`.
 * Used only as a test helper — not part of the public anchoring API.
 */
function rangeForChars(el: HTMLElement, start: number, end: number): Range {
  const range = document.createRange()
  let cursor = 0
  let startSet = false
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    const len = node.textContent?.length ?? 0
    if (!startSet && start >= cursor && start <= cursor + len) {
      range.setStart(node, start - cursor)
      startSet = true
    }
    if (end >= cursor && end <= cursor + len) {
      range.setEnd(node, end - cursor)
      return range
    }
    cursor += len
    node = walker.nextNode()
  }
  throw new Error(`Could not build range for [${start}, ${end}) in element of length ${cursor}`)
}

describe('lib/highlights/anchoring', () => {
  afterEach(cleanup)

  describe('rangeToAnchor', () => {
    it('happy path: single text node, returns offsets + capped prefix/suffix', () => {
      const article = makeArticle('<p>Hello world from blog.minghe.me today</p>')
      // textContent = "Hello world from blog.minghe.me today" (37 chars)
      const range = rangeForChars(article, 6, 11) // "world"

      const anchor = rangeToAnchor(range, article)

      expect(anchor).not.toBeNull()
      expect(anchor!.exact).toBe('world')
      expect(anchor!.startOffset).toBe(6)
      expect(anchor!.endOffset).toBe(11)
      expect(anchor!.prefix).toBe('Hello ')
      expect(anchor!.suffix).toBe(' from blog.minghe.me today')

      // Anchor must validate against the schema
      expect(() => HighlightAnchorSchema.parse(anchor)).not.toThrow()
    })

    it('caps prefix and suffix at 32 chars even for long surrounding text', () => {
      const before = 'a'.repeat(100)
      const after = 'b'.repeat(100)
      const article = makeArticle(`<p>${before}TARGET${after}</p>`)
      const range = rangeForChars(article, 100, 106) // "TARGET"

      const anchor = rangeToAnchor(range, article)!

      expect(anchor.prefix).toHaveLength(32)
      expect(anchor.suffix).toHaveLength(32)
      expect(anchor.prefix).toBe('a'.repeat(32))
      expect(anchor.suffix).toBe('b'.repeat(32))
    })

    it('handles range starting at offset 0 (empty prefix)', () => {
      const article = makeArticle('<p>Hello world</p>')
      const range = rangeForChars(article, 0, 5) // "Hello"

      const anchor = rangeToAnchor(range, article)!

      expect(anchor.exact).toBe('Hello')
      expect(anchor.prefix).toBe('')
      expect(anchor.suffix).toBe(' world')
    })

    it('handles range ending at end of article (empty suffix)', () => {
      const article = makeArticle('<p>Hello world</p>')
      const range = rangeForChars(article, 6, 11) // "world"

      const anchor = rangeToAnchor(range, article)!

      expect(anchor.exact).toBe('world')
      expect(anchor.suffix).toBe('')
    })

    it('handles range spanning multiple text nodes (across <strong>)', () => {
      const article = makeArticle('<p>Click <strong>here</strong> now please</p>')
      // textContent = "Click here now please" (21 chars)
      const range = rangeForChars(article, 4, 11) // "k here " across text→strong→text

      const anchor = rangeToAnchor(range, article)!

      expect(anchor.exact).toBe('k here ')
      expect(anchor.startOffset).toBe(4)
      expect(anchor.endOffset).toBe(11)
    })

    it('returns null for a range outside the article element', () => {
      const article = makeArticle('<p>inside</p>')
      const outside = document.createElement('div')
      outside.textContent = 'outside text'
      document.body.appendChild(outside)

      const range = document.createRange()
      range.setStart(outside.firstChild!, 0)
      range.setEnd(outside.firstChild!, 7) // "outside"

      const anchor = rangeToAnchor(range, article)

      expect(anchor).toBeNull()
    })

    it('returns null for a collapsed (zero-length) range', () => {
      const article = makeArticle('<p>Hello world</p>')
      const range = rangeForChars(article, 5, 5) // empty

      const anchor = rangeToAnchor(range, article)

      expect(anchor).toBeNull()
    })
  })

  describe('anchorToRange — fast path (offsets match)', () => {
    it('roundtrips single-node selection', () => {
      const article = makeArticle('<p>Hello world from blog</p>')
      const range = rangeForChars(article, 6, 11)
      const anchor = rangeToAnchor(range, article)!

      const restored = anchorToRange(anchor, article)

      expect(restored).not.toBeNull()
      expect(restored!.toString()).toBe('world')
    })

    it('roundtrips multi-node selection (across <strong>)', () => {
      const article = makeArticle('<p>The <strong>quick</strong> brown fox</p>')
      const range = rangeForChars(article, 0, 9) // "The quick"
      const anchor = rangeToAnchor(range, article)!

      const restored = anchorToRange(anchor, article)!

      expect(restored.toString()).toBe('The quick')
    })

    it('roundtrips across multiple paragraphs', () => {
      const article = makeArticle('<p>First paragraph.</p><p>Second paragraph.</p>')
      // textContent = "First paragraph.Second paragraph." (33 chars; no whitespace between blocks)
      const range = rangeForChars(article, 6, 25) // "paragraph.Second pa"
      const anchor = rangeToAnchor(range, article)!

      const restored = anchorToRange(anchor, article)!

      expect(restored.toString()).toBe('paragraph.Second pa')
    })
  })

  describe('anchorToRange — resilient path (prefix + exact + suffix)', () => {
    it('finds the highlight after content was inserted before it (offsets shifted)', () => {
      const original = makeArticle('<p>Hello world from blog.minghe.me</p>')
      const range = rangeForChars(original, 6, 11) // "world"
      const anchor = rangeToAnchor(range, original)!

      // Reader edits the post — adds an intro paragraph
      const edited = makeArticle('<p>NEW INTRO. Hello world from blog.minghe.me</p>')

      const restored = anchorToRange(anchor, edited)!

      expect(restored.toString()).toBe('world')
      // And it picked the RIGHT "world" (only one occurrence here, but offsets are stale)
    })

    it('disambiguates between two identical "exact" strings using prefix/suffix', () => {
      // textContent = "The cat sat on the mat. The cat ran away."
      const article = makeArticle('<p>The cat sat on the mat. The cat ran away.</p>')
      const firstCatRange = rangeForChars(article, 4, 7) // first "cat"
      const secondCatRange = rangeForChars(article, 28, 31) // second "cat"

      const firstAnchor = rangeToAnchor(firstCatRange, article)!
      const secondAnchor = rangeToAnchor(secondCatRange, article)!

      // Restore both — they should land on different occurrences
      const firstRestored = anchorToRange(firstAnchor, article)!
      const secondRestored = anchorToRange(secondAnchor, article)!

      // Compare by start offset within the article
      const articleText = article.textContent!
      const firstStart = articleText.indexOf(firstRestored.toString(), 0)
      // Crude but works: the first restored range should start at offset 4 (first "cat")
      // and the second at offset 28
      expect(firstAnchor.startOffset).toBe(4)
      expect(secondAnchor.startOffset).toBe(28)
      expect(firstRestored.toString()).toBe('cat')
      expect(secondRestored.toString()).toBe('cat')

      // Now mutate offsets so fast path misses, force resilient path
      const editedArticle = makeArticle('<p>NEW: The cat sat on the mat. The cat ran away.</p>')
      const firstRestoredEdited = anchorToRange(firstAnchor, editedArticle)!
      const secondRestoredEdited = anchorToRange(secondAnchor, editedArticle)!

      // First "cat" in edited article is at offset 9; second at 33.
      const editedText = editedArticle.textContent!
      const firstResolvedStart = computeRangeStart(firstRestoredEdited, editedArticle)
      const secondResolvedStart = computeRangeStart(secondRestoredEdited, editedArticle)
      expect(editedText.slice(firstResolvedStart, firstResolvedStart + 3)).toBe('cat')
      expect(editedText.slice(secondResolvedStart, secondResolvedStart + 3)).toBe('cat')
      expect(firstResolvedStart).not.toBe(secondResolvedStart)
      expect(firstResolvedStart).toBeLessThan(secondResolvedStart)
    })
  })

  describe('anchorToRange — last-resort path (exact only)', () => {
    it('still finds a unique exact match when prefix+suffix fail to combine', () => {
      const original = makeArticle('<p>Look at this UNIQUEPHRASE in the text</p>')
      const range = rangeForChars(original, 13, 25) // "UNIQUEPHRASE" (12 chars)
      const anchor = rangeToAnchor(range, original)!

      // Heavy edit — surrounding context is gone, only the unique phrase remains
      const edited = makeArticle('<p>Totally different. UNIQUEPHRASE. Different again.</p>')

      const restored = anchorToRange(anchor, edited)

      expect(restored).not.toBeNull()
      expect(restored!.toString()).toBe('UNIQUEPHRASE')
    })
  })

  describe('anchorToRange — orphan detection', () => {
    it('returns null when exact text is gone entirely', () => {
      const original = makeArticle('<p>Hello DELETEME world</p>')
      const range = rangeForChars(original, 6, 14) // "DELETEME"
      const anchor = rangeToAnchor(range, original)!

      const edited = makeArticle('<p>Hello world</p>')

      const restored = anchorToRange(anchor, edited)

      expect(restored).toBeNull()
    })

    it('returns null for empty article', () => {
      const article = makeArticle('')
      const anchor = {
        startOffset: 0,
        endOffset: 5,
        exact: 'hello',
        prefix: '',
        suffix: '',
      }

      const restored = anchorToRange(anchor, article)

      expect(restored).toBeNull()
    })
  })
})

/**
 * Helper: compute the starting char offset of `range` within
 * `root.textContent`. Used to assert WHICH occurrence got picked.
 */
function computeRangeStart(range: Range, root: HTMLElement): number {
  const pre = document.createRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}
