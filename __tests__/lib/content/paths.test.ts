import { CONTENT_ROOT, contentPaths } from '@/lib/content/paths'

describe('contentPaths registry', () => {
  it('roots everything under CONTENT_ROOT', () => {
    expect(CONTENT_ROOT).toBe('data')
    for (const build of Object.values(contentPaths)) {
      expect((build as (a?: string) => string)('x')).toMatch(/^data(\/|$)/)
    }
  })

  it('returns the canonical repo-relative paths', () => {
    expect(contentPaths.root()).toBe('data')
    expect(contentPaths.rootKeep()).toBe('data/.gitkeep')
    expect(contentPaths.blogDir()).toBe('data/blog')
    expect(contentPaths.blogDirKeep()).toBe('data/blog/.gitkeep')
    expect(contentPaths.blogManifest()).toBe('data/blog-manifest.json')
    expect(contentPaths.memos()).toBe('data/memos.json')
    expect(contentPaths.likes()).toBe('data/likes.json')
    expect(contentPaths.siteConfig()).toBe('data/site-config.json')
    expect(contentPaths.highlightsDir()).toBe('data/highlights')
  })

  it('builds a blog path from a bare slug (no .md) and appends exactly one .md', () => {
    expect(contentPaths.blogPost('hello-world')).toBe('data/blog/hello-world.md')
    // slug must not be double-suffixed by the helper
    expect(contentPaths.blogPost('hello-world')).not.toContain('.md.md')
  })

  it('builds a blog path from a filename that already has .md', () => {
    expect(contentPaths.blogFile('hello-world.md')).toBe('data/blog/hello-world.md')
  })

  it('builds a highlights file path from a slug', () => {
    expect(contentPaths.highlightsFile('hello-world')).toBe('data/highlights/hello-world.json')
  })

  it('produces no leading slash (safe to join or concat behind a base URL)', () => {
    expect(contentPaths.blogPost('x').startsWith('/')).toBe(false)
    expect(contentPaths.memos().startsWith('/')).toBe(false)
  })
})
