/**
 * @jest-environment node
 */
import path from 'path'

describe('resolveRuntimeConfig precedence', () => {
  const saved = { ...process.env }

  async function resolve(env: Record<string, string | undefined>, token?: string) {
    jest.resetModules()
    for (const k of ['CICI_DIR', 'CICI_REPO', 'CICI_TOKEN', 'GITHUB_USERNAME', 'NODE_ENV']) delete process.env[k]
    Object.assign(process.env, env)
    const { resolveRuntimeConfig } = await import('@/lib/runtime/config')
    return resolveRuntimeConfig(token)
  }

  afterEach(() => {
    for (const k of ['CICI_DIR', 'CICI_REPO', 'CICI_TOKEN', 'GITHUB_USERNAME']) delete process.env[k]
    Object.assign(process.env, saved)
  })

  it('CICI_DIR wins → local', async () => {
    const cfg = await resolve({ CICI_DIR: '/tmp/blog', CICI_REPO: 'a/b', GITHUB_USERNAME: 'x' })
    expect(cfg).toEqual({ kind: 'local', dir: path.resolve('/tmp/blog') })
  })

  it('CICI_REPO → github with owner/repo and optional token', async () => {
    const cfg = await resolve({ CICI_REPO: 'metrue/cici', CICI_TOKEN: 'tkn' })
    expect(cfg).toEqual({ kind: 'github', owner: 'metrue', repo: 'cici', token: 'tkn' })
  })

  it('CICI_REPO without name defaults repo to cici; session token used when no CICI_TOKEN', async () => {
    const cfg = await resolve({ CICI_REPO: 'someone' }, 'session-tok')
    expect(cfg).toEqual({ kind: 'github', owner: 'someone', repo: 'cici', token: 'session-tok' })
  })

  it('development with no target → local cwd/sample-content', async () => {
    const cfg = await resolve({ NODE_ENV: 'development' })
    expect(cfg).toEqual({ kind: 'local', dir: path.join(process.cwd(), 'sample-content') })
  })

  it('production default → github from GITHUB_USERNAME + session token', async () => {
    const cfg = await resolve({ NODE_ENV: 'production', GITHUB_USERNAME: 'metrue' }, 'sess')
    expect(cfg).toEqual({ kind: 'github', owner: 'metrue', repo: 'cici', token: 'sess' })
  })
})
