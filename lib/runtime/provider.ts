/**
 * Provider factory — the single place the backend is chosen.
 *
 * The render layer calls `getProvider(sessionToken?)` and gets a
 * `ContentProvider`; it never constructs LocalProvider/GitHubProvider or
 * touches `fs`/Octokit directly.
 *
 * Server-only.
 */

import { resolveRuntimeConfig } from './config'
import { LocalProvider } from './localProvider'
import { GitHubProvider } from './githubProvider'
import type { ContentProvider, RuntimeConfig } from './types'

export function providerFromConfig(config: RuntimeConfig): ContentProvider {
  if (config.kind === 'local') {
    return new LocalProvider(config.dir)
  }
  return new GitHubProvider({ owner: config.owner, repo: config.repo, token: config.token })
}

/**
 * Get the active content provider. Pass the current session's GitHub token (if
 * any) so production/`--repo` writes are authorized; omit it for pure reads.
 */
export function getProvider(sessionToken?: string): ContentProvider {
  return providerFromConfig(resolveRuntimeConfig(sessionToken))
}

export type { ContentProvider } from './types'
export { ReadOnlyError } from './types'
