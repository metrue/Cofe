/**
 * Runtime mode detection (server-only).
 *
 * Cofe has two backends for content:
 *   - GitHub (production on Vercel): reads via raw URLs, writes via Octokit.
 *   - Local filesystem: reads/writes a directory on disk.
 *
 * Historically the local backend was reachable only in `NODE_ENV=development`
 * (rooted at `process.cwd()/data`). "Local mode" generalizes that so a
 * prebuilt binary — `npx cofe --data <dir>` — can serve and edit any folder:
 * the CLI sets `COFE_DATA_DIR` to an absolute path and that directory IS the
 * content root (it contains `blog/`, `memos.json`, … directly, with no `data/`
 * prefix).
 *
 * Server-only: this reads `process.env` and `path`. Do not import from client
 * components. Client code learns the mode via the layout → context injection.
 */

import path from 'path'

/** True when launched against a user-supplied content directory (`npx cofe --data`). */
export function isLocalMode(): boolean {
  return !!process.env.COFE_DATA_DIR
}

/**
 * Absolute path to the content root.
 * - Local mode: the `--data` directory itself.
 * - Dev fallback: `<cwd>/data` (repo-embedded content), preserving prior behavior.
 */
export function localDataDir(): string {
  const dir = process.env.COFE_DATA_DIR
  if (dir) return path.resolve(dir)
  return path.join(process.cwd(), 'data')
}

/**
 * Whether to use the local filesystem backend instead of GitHub.
 * True in local mode, or in development (unchanged legacy behavior).
 */
export function useLocalBackend(): boolean {
  return isLocalMode() || process.env.NODE_ENV === 'development'
}
