/**
 * Runtime mode helpers (server-only). Thin booleans derived from the SINGLE
 * source of truth — `resolveRuntimeConfig()` — for render-layer spots that only
 * need "is the backend local" (asset route, highlights, editor gate) without
 * building a full provider.
 *
 * Server-only: reads process.env + path. Do not import from client components.
 */

import path from 'path'
import { resolveRuntimeConfig } from './config'

/**
 * True when the active backend is the local filesystem — `npx cici --dir` OR
 * `next dev`. Derived from the same config the provider factory uses, so the
 * two never disagree.
 */
export function isLocalMode(): boolean {
  return resolveRuntimeConfig().kind === 'local'
}

/**
 * Absolute path to the local content root: the `--dir` directory, or the shipped
 * `<cwd>/sample-content` demo fixture in development.
 */
export function localDataDir(): string {
  const dir = process.env.CICI_DIR
  if (dir) return path.resolve(dir)
  return path.join(process.cwd(), 'sample-content')
}
