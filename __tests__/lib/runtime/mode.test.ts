/**
 * @jest-environment node
 *
 * isLocalMode() must agree with the provider factory's backend choice — the
 * single source of truth. In particular dev (no COFE_DIR) is local, which the
 * asset-serving route relies on.
 */
describe('isLocalMode (derived from resolveRuntimeConfig)', () => {
  const saved = { ...process.env }

  async function isLocal(env: Record<string, string | undefined>) {
    jest.resetModules()
    for (const k of ['COFE_DIR', 'COFE_REPO', 'GITHUB_USERNAME', 'NODE_ENV']) delete process.env[k]
    Object.assign(process.env, env)
    const { isLocalMode } = await import('@/lib/runtime/mode')
    return isLocalMode()
  }

  afterEach(() => {
    for (const k of ['COFE_DIR', 'COFE_REPO', 'GITHUB_USERNAME']) delete process.env[k]
    Object.assign(process.env, saved)
  })

  it('true with COFE_DIR', async () => expect(await isLocal({ COFE_DIR: '/tmp/b' })).toBe(true))
  it('true in development with no target (matches provider → local cwd/data)', async () =>
    expect(await isLocal({ NODE_ENV: 'development' })).toBe(true))
  it('false for a remote repo', async () =>
    expect(await isLocal({ COFE_REPO: 'metrue/Cofe' })).toBe(false))
  it('false in production default', async () =>
    expect(await isLocal({ NODE_ENV: 'production', GITHUB_USERNAME: 'metrue' })).toBe(false))
})
