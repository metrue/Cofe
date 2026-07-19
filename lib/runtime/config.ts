/**
 * Resolve the runtime configuration from environment (set by the CLI or the
 * deploy platform). This is the single source of truth for "which backend".
 *
 * Precedence:
 *   1. COFE_DIR              → local filesystem (`npx cofe --dir <path>`)
 *   2. COFE_REPO=owner/name  → remote GitHub repo (`npx cofe --repo owner/name`);
 *                              COFE_TOKEN (optional) enables writes
 *   3. GITHUB_USERNAME       → production: the owner's repo, session token for writes
 *
 * Server-only (reads process.env + path). Do not import from client components.
 */

import path from 'path'
import type { RuntimeConfig } from './types'

const DEFAULT_REPO = 'Cofe'

export function resolveRuntimeConfig(sessionToken?: string): RuntimeConfig {
  const dir = process.env.COFE_DIR
  if (dir) {
    return { kind: 'local', dir: path.resolve(dir) }
  }

  const repoSpec = process.env.COFE_REPO
  if (repoSpec) {
    const [owner, repo] = repoSpec.split('/')
    if (!owner) {
      throw new Error(`Invalid COFE_REPO "${repoSpec}" — expected "owner/name".`)
    }
    return {
      kind: 'github',
      owner,
      repo: repo || DEFAULT_REPO,
      token: process.env.COFE_TOKEN || sessionToken || undefined,
    }
  }

  // Local development: serve the repo-embedded content under <cwd>/data.
  if (process.env.NODE_ENV === 'development') {
    return { kind: 'local', dir: path.join(process.cwd(), 'data') }
  }

  // Production / default: the deployed owner's repo, session token for writes.
  const owner = process.env.GITHUB_USERNAME || 'metrue'
  return { kind: 'github', owner, repo: DEFAULT_REPO, token: sessionToken || undefined }
}
