/**
 * @jest-environment node
 */
import path from 'path'

describe('resolveRuntimeConfig precedence', () => {
  const saved = { ...process.env }

  async function resolve(env: Record<string, string | undefined>, token?: string) {
    jest.resetModules()
    for (const k of ['COFE_DIR', 'COFE_REPO', 'COFE_TOKEN', 'GITHUB_USERNAME', 'NODE_ENV']) delete process.env[k]
    Object.assign(process.env, env)
    const { resolveRuntimeConfig } = await import('@/lib/runtime/config')
    return resolveRuntimeConfig(token)
  }

  afterEach(() => {
    for (const k of ['COFE_DIR', 'COFE_REPO', 'COFE_TOKEN', 'GITHUB_USERNAME']) delete process.env[k]
    Object.assign(process.env, saved)
  })

  it('COFE_DIR wins → local', async () => {
    const cfg = await resolve({ COFE_DIR: '/tmp/blog', COFE_REPO: 'a/b', GITHUB_USERNAME: 'x' })
    expect(cfg).toEqual({ kind: 'local', dir: path.resolve('/tmp/blog') })
  })

  it('COFE_REPO → github with owner/repo and optional token', async () => {
    const cfg = await resolve({ COFE_REPO: 'metrue/Cofe', COFE_TOKEN: 'tkn' })
    expect(cfg).toEqual({ kind: 'github', owner: 'metrue', repo: 'Cofe', token: 'tkn' })
  })

  it('COFE_REPO without name defaults repo to Cofe; session token used when no COFE_TOKEN', async () => {
    const cfg = await resolve({ COFE_REPO: 'someone' }, 'session-tok')
    expect(cfg).toEqual({ kind: 'github', owner: 'someone', repo: 'Cofe', token: 'session-tok' })
  })

  it('development with no target → local cwd/data', async () => {
    const cfg = await resolve({ NODE_ENV: 'development' })
    expect(cfg).toEqual({ kind: 'local', dir: path.join(process.cwd(), 'data') })
  })

  it('production default → github from GITHUB_USERNAME + session token', async () => {
    const cfg = await resolve({ NODE_ENV: 'production', GITHUB_USERNAME: 'metrue' }, 'sess')
    expect(cfg).toEqual({ kind: 'github', owner: 'metrue', repo: 'Cofe', token: 'sess' })
  })
})
