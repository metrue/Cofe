import {
  buildBlogMarkdown,
  slugFromTitle,
  formatDiscussions,
  extractDate,
  extractStatus,
} from '@/lib/blogFrontmatter'

describe('blogFrontmatter', () => {
  it('slugFromTitle lowercases and hyphenates', () => {
    expect(slugFromTitle('Hello World Post')).toBe('hello-world-post')
  })

  it('formatDiscussions is empty for none, structured otherwise', () => {
    expect(formatDiscussions([])).toBe('')
    expect(formatDiscussions([{ platform: 'x', url: 'https://x/1' }])).toBe(
      'external_discussions:\n  - platform: x\n    url: https://x/1\n'
    )
  })

  it('buildBlogMarkdown omits status front-matter when published', () => {
    const md = buildBlogMarkdown({ title: 'T', date: '2020-01-01', content: 'body' })
    expect(md).toContain('---\ntitle: T\ndate: 2020-01-01\n')
    expect(md).not.toContain('status:')
    expect(md.endsWith('---\n\nbody')).toBe(true)
  })

  it('buildBlogMarkdown emits status for drafts and location when given', () => {
    const md = buildBlogMarkdown({
      title: 'T',
      date: '2020-01-01',
      content: 'body',
      status: 'draft',
      location: { city: 'Amsterdam' },
    })
    expect(md).toContain('status: draft\n')
    expect(md).toContain('city: Amsterdam\n')
  })

  it('extractDate / extractStatus round-trip', () => {
    const md = buildBlogMarkdown({ title: 'T', date: '2021-05-05', content: 'x', status: 'draft' })
    expect(extractDate(md)).toBe('2021-05-05')
    expect(extractStatus(md)).toBe('draft')
    expect(extractStatus('no status here')).toBeUndefined()
  })
})
