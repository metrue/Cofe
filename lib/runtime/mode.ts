/**
 * Runtime mode helpers (server-only). Thin predicates over the environment the
 * CLI / deploy platform sets. The authoritative backend choice lives in
 * `config.ts` (resolveRuntimeConfig) + the provider factory; these helpers are
 * for render-layer spots that only need a boolean (layout, editor gate, asset
 * routes, highlights).
 *
 * Server-only: reads process.env + path. Do not import from client components.
 */

import path from 'path'

/** Local filesystem mode — `npx cofe --dir <path>` (sets COFE_DIR). */
export function isLocalMode(): boolean {
  return !!process.env.COFE_DIR
}

/** Remote-repo mode — `npx cofe --repo owner/name` (sets COFE_REPO). */
export function isRepoMode(): boolean {
  return !!process.env.COFE_REPO
}

/**
 * Absolute path to the local content root.
 * - Local mode: the `--dir` directory itself.
 * - Dev fallback: `<cwd>/data` (repo-embedded content).
 */
export function localDataDir(): string {
  const dir = process.env.COFE_DIR
  if (dir) return path.resolve(dir)
  return path.join(process.cwd(), 'data')
}

/**
 * Whether the local filesystem backend is active (local mode, or dev). Used by
 * the highlights repo factory and dev tooling. The provider factory makes the
 * primary decision; this stays for the highlights sub-domain + dev.
 */
export function shouldUseLocalBackend(): boolean {
  return isLocalMode() || process.env.NODE_ENV === 'development'
}
