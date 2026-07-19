/**
 * @jest-environment node
 *
 * GitHubProvider read strategy: API-fresh when authenticated (with raw-URL
 * fallback), raw-only when read-only.
 */
import { GitHubProvider } from '@/lib/runtime/githubProvider'
import { createGitHubAPIClient } from '@/lib/client'
import { PublicGitHubClient } from '@/lib/publicClient'

jest.mock('@/lib/client')
jest.mock('@/lib/publicClient')

const apiGetBlogPosts = jest.fn()
const rawGetBlogPosts = jest.fn()

function stubReaders() {
  ;(createGitHubAPIClient as jest.Mock).mockReturnValue({
    getBlogPosts: apiGetBlogPosts,
    getBlogPost: jest.fn(),
    getMemos: jest.fn(),
    getLinks: jest.fn(),
    getLikes: jest.fn(),
  })
  ;(PublicGitHubClient as unknown as jest.Mock).mockImplementation(() => ({
    getBlogPosts: rawGetBlogPosts,
    getBlogPost: jest.fn(),
    getMemos: jest.fn(),
    getLinks: jest.fn(),
    getLikes: jest.fn(),
  }))
}

describe('GitHubProvider read strategy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    stubReaders()
  })

  it('with a token, reads go through the API (fresh), not raw', async () => {
    apiGetBlogPosts.mockResolvedValue([{ id: 'a' }])
    const p = new GitHubProvider({ owner: 'metrue', repo: 'cici', token: 'tkn' })
    const posts = await p.getBlogPosts({ includeDrafts: true })
    expect(apiGetBlogPosts).toHaveBeenCalledWith('metrue', true)
    expect(rawGetBlogPosts).not.toHaveBeenCalled()
    expect(posts).toEqual([{ id: 'a' }])
  })

  it('falls back to raw URLs when the API read throws', async () => {
    apiGetBlogPosts.mockRejectedValue(new Error('rate limited'))
    rawGetBlogPosts.mockResolvedValue([{ id: 'raw' }])
    const p = new GitHubProvider({ owner: 'metrue', repo: 'cici', token: 'tkn' })
    const posts = await p.getBlogPosts()
    expect(apiGetBlogPosts).toHaveBeenCalled()
    expect(rawGetBlogPosts).toHaveBeenCalledWith(false)
    expect(posts).toEqual([{ id: 'raw' }])
  })

  it('without a token, no API client is created — raw only', async () => {
    rawGetBlogPosts.mockResolvedValue([{ id: 'pub' }])
    const p = new GitHubProvider({ owner: 'metrue', repo: 'cici' })
    const posts = await p.getBlogPosts()
    expect(createGitHubAPIClient).not.toHaveBeenCalled()
    expect(rawGetBlogPosts).toHaveBeenCalledWith(false)
    expect(posts).toEqual([{ id: 'pub' }])
  })
})
