#!/usr/bin/env node
/**
 * `npx cofe --data <dir>` — serve and edit a local Cofe blog.
 *
 * Boots the prebuilt Next.js standalone server against a user-supplied content
 * directory. That directory IS the content root (it holds `blog/`, `memos.json`,
 * `site-config.json`, …). No GitHub, no OAuth, no Vercel — reads and writes go
 * straight to disk (see lib/runtime/mode.ts, gated on COFE_DATA_DIR).
 */

'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const pkg = require('../package.json')

function printHelp() {
  process.stdout.write(`
cofe ${pkg.version} — serve and edit your blog from a local folder

Usage:
  npx cofe --data <dir> [options]

Options:
  --data <dir>     Path to your content folder (contains blog/, memos.json, …). Required.
  --port, -p <n>   Port to listen on (default: 3000)
  --host <addr>    Host to bind (default: 127.0.0.1)
  --version, -v    Print version
  --help, -h       Show this help

Example:
  npx cofe --data ~/my-blog --port 4000
`)
}

/** Tiny arg parser: supports "--flag value" and "--flag=value". */
function parseArgs(argv) {
  const out = { data: undefined, port: '3000', host: '127.0.0.1', help: false, version: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const eq = arg.indexOf('=')
    const key = eq === -1 ? arg : arg.slice(0, eq)
    const inlineVal = eq === -1 ? undefined : arg.slice(eq + 1)
    const takeVal = () => (inlineVal !== undefined ? inlineVal : argv[++i])
    switch (key) {
      case '--data': out.data = takeVal(); break
      case '--port': case '-p': out.port = takeVal(); break
      case '--host': out.host = takeVal(); break
      case '--help': case '-h': out.help = true; break
      case '--version': case '-v': out.version = true; break
      default:
        process.stderr.write(`cofe: unknown option "${arg}"\n`)
        printHelp()
        process.exit(1)
    }
  }
  return out
}

function fail(msg) {
  process.stderr.write(`cofe: ${msg}\n`)
  process.exit(1)
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) { printHelp(); return }
  if (args.version) { process.stdout.write(`${pkg.version}\n`); return }

  if (!args.data) fail('missing required --data <dir>. Run `cofe --help`.')

  const dataDir = path.resolve(args.data)
  if (!fs.existsSync(dataDir) || !fs.statSync(dataDir).isDirectory()) {
    fail(`--data path is not a directory: ${dataDir}`)
  }

  const port = String(parseInt(args.port, 10) || 3000)
  const host = args.host

  // Gentle first-run hint — serve anyway (empty reads degrade gracefully).
  const hasBlog = fs.existsSync(path.join(dataDir, 'blog'))
  const hasMemos = fs.existsSync(path.join(dataDir, 'memos.json'))
  if (!hasBlog && !hasMemos) {
    process.stderr.write(
      `cofe: note — ${dataDir} has no blog/ folder or memos.json yet. ` +
      `Starting empty; create posts in the editor.\n`
    )
  }

  // --- Runtime environment for the standalone server ---
  process.env.COFE_DATA_DIR = dataDir          // activates local mode (lib/runtime/mode.ts)
  process.env.PORT = port
  process.env.HOSTNAME = host
  // NextAuth still initializes; give it a secret + url so getToken() doesn't throw.
  // Auth is bypassed in local mode, so an ephemeral per-run secret is fine.
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('hex')
  }
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = `http://${host}:${port}`
  }

  const serverPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js')
  if (!fs.existsSync(serverPath)) {
    fail(
      'prebuilt server not found (.next/standalone/server.js). ' +
      'If running from source, build first: `npm run build && node scripts/assemble-standalone.js`.'
    )
  }

  process.stdout.write(`\n  cofe ${pkg.version}\n  serving ${dataDir}\n  → http://${host}:${port}\n\n`)

  // The standalone server reads PORT/HOSTNAME from env and starts listening on require.
  require(serverPath)
}

main()
