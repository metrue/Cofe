/**
 * @jest-environment node
 *
 * GitHubProvider read-only semantics — writes must throw before any network
 * call when no token is configured.
 */
import { GitHubProvider } from '@/lib/runtime/githubProvider'
import { ReadOnlyError } from '@/lib/runtime/types'

describe('GitHubProvider read-only (no token)', () => {
  const ro = new GitHubProvider({ owner: 'metrue', repo: 'Cofe' })
  const rw = new GitHubProvider({ owner: 'metrue', repo: 'Cofe', token: 'tkn' })

  it('canWrite reflects token presence', () => {
    expect(ro.canWrite()).toBe(false)
    expect(rw.canWrite()).toBe(true)
  })

  it('label marks read-only', () => {
    expect(ro.label).toBe('github: metrue/Cofe (read-only)')
    expect(rw.label).toBe('github: metrue/Cofe')
  })

  it('writes throw ReadOnlyError without a token (no network)', async () => {
    await expect(ro.createBlogPost({ title: 't', content: 'c' })).rejects.toBeInstanceOf(ReadOnlyError)
    await expect(ro.updateBlogPost('id', { title: 't', content: 'c' })).rejects.toBeInstanceOf(ReadOnlyError)
    await expect(ro.deleteBlogPost('id')).rejects.toBeInstanceOf(ReadOnlyError)
    await expect(ro.createMemo({ id: 'm', content: 'x', timestamp: 't' })).rejects.toBeInstanceOf(ReadOnlyError)
    await expect(ro.updateMemo('m', 'x')).rejects.toBeInstanceOf(ReadOnlyError)
    await expect(ro.deleteMemo('m')).rejects.toBeInstanceOf(ReadOnlyError)
    await expect(ro.updateLikes({})).rejects.toBeInstanceOf(ReadOnlyError)
  })
})
