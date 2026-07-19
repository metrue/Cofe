#!/usr/bin/env node
/**
 * `npx cici` — serve and edit a cici blog from local files or a GitHub repo.
 *
 *   npx cici --dir <path>          serve/edit a local content folder
 *   npx cici --repo <owner/name>   serve a remote GitHub content repo (read-only)
 *   npx cici --repo <owner/name> --token <t>   ...and edit it
 *
 * Boots the prebuilt Next.js standalone server. The backend is chosen at runtime
 * by lib/runtime/config.ts from the env vars set below (CICI_DIR / CICI_REPO /
 * CICI_TOKEN). No GitHub OAuth, no Vercel.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const pkg = require('../package.json')

function printHelp() {
  process.stdout.write(`
cici ${pkg.version} — serve and edit your blog from local files or a GitHub repo

Usage:
  npx cici --dir <path> [options]
  npx cici --repo <owner/name> [--token <token>] [options]

Targets (exactly one required):
  --dir <path>       Local content folder (contains blog/, memos.json, …)
  --repo <owner/name> Remote GitHub content repo (read-only unless --token given)

Options:
  --token <token>    GitHub token — enables editing a --repo target
  --port, -p <n>     Port to listen on (default: 3000)
  --host <addr>      Host to bind (default: 127.0.0.1)
  --version, -v      Print version
  --help, -h         Show this help

Examples:
  npx cici --dir ~/my-blog
  npx cici --repo metrue/cici
  npx cici --repo metrue/cici --token ghp_xxx --port 4000
`)
}

function parseArgs(argv) {
  const out = { dir: undefined, repo: undefined, token: undefined, port: '3000', host: '127.0.0.1', help: false, version: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const eq = arg.indexOf('=')
    const key = eq === -1 ? arg : arg.slice(0, eq)
    const inlineVal = eq === -1 ? undefined : arg.slice(eq + 1)
    const takeVal = () => (inlineVal !== undefined ? inlineVal : argv[++i])
    switch (key) {
      case '--dir': out.dir = takeVal(); break
      case '--repo': out.repo = takeVal(); break
      case '--token': out.token = takeVal(); break
      case '--port': case '-p': out.port = takeVal(); break
      case '--host': out.host = takeVal(); break
      case '--help': case '-h': out.help = true; break
      case '--version': case '-v': out.version = true; break
      default:
        process.stderr.write(`cici: unknown option "${arg}"\n`)
        printHelp()
        process.exit(1)
    }
  }
  return out
}

function fail(msg) {
  process.stderr.write(`cici: ${msg}\n`)
  process.exit(1)
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) { printHelp(); return }
  if (args.version) { process.stdout.write(`${pkg.version}\n`); return }

  if (!args.dir && !args.repo) fail('provide exactly one of --dir <path> or --repo <owner/name>. Run `cici --help`.')
  if (args.dir && args.repo) fail('use only one of --dir or --repo, not both.')

  const port = String(parseInt(args.port, 10) || 3000)
  const host = args.host

  let servingLabel
  if (args.dir) {
    const dir = path.resolve(args.dir)
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      fail(`--dir path is not a directory: ${dir}`)
    }
    if (!fs.existsSync(path.join(dir, 'blog')) && !fs.existsSync(path.join(dir, 'memos.json'))) {
      process.stderr.write(`cici: note — ${dir} has no blog/ or memos.json yet. Starting empty.\n`)
    }
    process.env.CICI_DIR = dir
    servingLabel = dir
  } else {
    if (!/^[^/]+\/[^/]+$/.test(args.repo)) {
      fail(`--repo must be "owner/name" (got "${args.repo}").`)
    }
    process.env.CICI_REPO = args.repo
    if (args.token) process.env.CICI_TOKEN = args.token
    servingLabel = `${args.repo}${args.token ? '' : ' (read-only)'}`
  }

  process.env.PORT = port
  process.env.HOSTNAME = host
  // Auth is bypassed in these modes, but NextAuth's getToken() still runs —
  // give it a secret + url so it doesn't throw. Ephemeral per run.
  if (!process.env.NEXTAUTH_SECRET) process.env.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('hex')
  if (!process.env.NEXTAUTH_URL) process.env.NEXTAUTH_URL = `http://${host}:${port}`

  const serverPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js')
  if (!fs.existsSync(serverPath)) {
    fail(
      'prebuilt server not found (.next/standalone/server.js). ' +
      'If running from source, build first: `npm run build:cli`.'
    )
  }

  process.stdout.write(`\n  cici ${pkg.version}\n  serving ${servingLabel}\n  → http://${host}:${port}\n\n`)

  require(serverPath)
}

main()
