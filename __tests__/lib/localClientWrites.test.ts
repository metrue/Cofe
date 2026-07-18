/**
 * @jest-environment node
 *
 * Exercises the local filesystem WRITE path used by `npx cofe --data <dir>`:
 * createBlogPost / updateBlogPost / deleteBlogPost / updateMemo / deleteMemo,
 * rooted at COFE_DATA_DIR.
 */
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'

describe('LocalFileSystemClient writes (local mode)', () => {
  let tmpDir: string
  const prevDataDir = process.env.COFE_DATA_DIR

  // Re-require the module after setting env, since localDataDir() reads process.env.
  async function freshClient() {
    jest.resetModules()
    const mod = await import('@/lib/localClient.server')
    return mod.createLocalFileSystemClient()
  }

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cofe-local-'))
    process.env.COFE_DATA_DIR = tmpDir
    await fs.mkdir(path.join(tmpDir, 'blog'), { recursive: true })
    await fs.writeFile(path.join(tmpDir, 'memos.json'), '[]', 'utf-8')
  })

  afterEach(async () => {
    if (prevDataDir === undefined) delete process.env.COFE_DATA_DIR
    else process.env.COFE_DATA_DIR = prevDataDir
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('creates a blog post file at <dataDir>/blog/<slug>.md (no data/ prefix)', async () => {
    const client = await freshClient()
    const slug = await client.createBlogPost({ title: 'Hello World', content: 'body text' })
    expect(slug).toBe('hello-world')
    const file = path.join(tmpDir, 'blog', 'hello-world.md')
    const md = await fs.readFile(file, 'utf-8')
    expect(md).toContain('title: Hello World')
    expect(md).toContain('body text')
  })

  it('updates a post, preserving the original date', async () => {
    const client = await freshClient()
    await client.createBlogPost({ title: 'Keep Date', content: 'v1' })
    const created = await fs.readFile(path.join(tmpDir, 'blog', 'keep-date.md'), 'utf-8')
    const originalDate = created.match(/date:\s*(.+)/)![1]

    await client.updateBlogPost('keep-date', { title: 'Keep Date', content: 'v2 edited' })
    const updated = await fs.readFile(path.join(tmpDir, 'blog', 'keep-date.md'), 'utf-8')
    expect(updated).toContain('v2 edited')
    expect(updated.match(/date:\s*(.+)/)![1]).toBe(originalDate)
  })

  it('deletes a post (idempotent)', async () => {
    const client = await freshClient()
    await client.createBlogPost({ title: 'Doomed', content: 'x' })
    const file = path.join(tmpDir, 'blog', 'doomed.md')
    expect(await fs.readFile(file, 'utf-8')).toContain('Doomed')
    await client.deleteBlogPost('doomed')
    await expect(fs.access(file)).rejects.toThrow()
    await expect(client.deleteBlogPost('doomed')).resolves.toBeUndefined() // no throw
  })

  it('creates, updates, and deletes a memo in memos.json', async () => {
    const client = await freshClient()
    const memo = await client.createMemo({ id: 'm1', content: 'first', timestamp: '2020-01-01T00:00:00Z' })
    expect(memo.id).toBe('m1')

    const updated = await client.updateMemo('m1', 'edited')
    expect(updated.content).toBe('edited')
    expect(updated.timestamp).toBe('2020-01-01T00:00:00Z') // preserved

    await client.deleteMemo('m1')
    const raw = JSON.parse(await fs.readFile(path.join(tmpDir, 'memos.json'), 'utf-8'))
    expect(raw).toEqual([])
  })
})
