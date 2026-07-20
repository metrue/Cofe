#!/usr/bin/env node
/**
 * `npx cici` — serve and edit a cici blog from local files or a GitHub repo.
 *
 *   npx cici --dir <path>          serve/edit a local content folder
 *   npx cici --repo <owner/name>   serve a remote GitHub content repo (read-only)
 *   npx cici --repo <owner/name> --token <t>   ...and edit it
 *
 *   npx cici start                 boot the server from preset env (platform deploy)
 *   npx cici build                 stage cici's prebuilt output into a content repo
 *
 * cici is pure tooling — the blog *content* lives in a separate repo (or a local
 * folder). The backend is chosen at runtime by lib/runtime/config.ts from the env
 * vars set below (CICI_DIR / CICI_REPO / CICI_TOKEN). No GitHub OAuth, no Vercel.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const pkg = require('../package.json')

/** cici package root (holds the prebuilt .next/standalone output). */
const CICI_ROOT = path.join(__dirname, '..')

function printHelp() {
  process.stdout.write(`
cici ${pkg.version} — serve and edit your blog from local files or a GitHub repo

Usage:
  npx cici --dir <path> [options]
  npx cici --repo <owner/name> [--token <token>] [options]
  npx cici start
  npx cici build

Commands:
  (default)          Serve a --dir or --repo target (see below)
  start              Boot the server from preset env (CICI_REPO/CICI_TOKEN/CICI_DIR/
                     PORT/HOST) — for platform deploys where the host sets env
  build              Stage cici's prebuilt Next output (.next/standalone, .next/static,
                     public) into the current directory so a host (e.g. Vercel) can serve it

Targets (exactly one required for the default command):
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
  npx cici start
  npx cici build
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

/** Path to the prebuilt standalone server inside the cici package. */
function serverPath() {
  return path.join(CICI_ROOT, '.next', 'standalone', 'server.js')
}

/**
 * Boot the prebuilt Next.js standalone server on host:port. Fills in ephemeral
 * NextAuth secret/url so getToken() doesn't throw in the no-OAuth CLI modes.
 * The backend itself is resolved from env by lib/runtime/config.ts.
 */
function bootServer({ port, host, servingLabel }) {
  process.env.PORT = port
  process.env.HOSTNAME = host
  // Auth is bypassed in these modes, but NextAuth's getToken() still runs —
  // give it a secret + url so it doesn't throw. Ephemeral per run.
  if (!process.env.NEXTAUTH_SECRET) process.env.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('hex')
  if (!process.env.NEXTAUTH_URL) process.env.NEXTAUTH_URL = `http://${host}:${port}`

  const server = serverPath()
  if (!fs.existsSync(server)) {
    fail(
      'prebuilt server not found (.next/standalone/server.js). ' +
      'If running from source, build first: `npm run build:cli`.'
    )
  }

  process.stdout.write(`\n  cici ${pkg.version}\n  serving ${servingLabel}\n  → http://${host}:${port}\n\n`)

  require(server)
}

/**
 * `cici start` — boot the server purely from preset env (CICI_REPO/CICI_TOKEN/
 * CICI_DIR/PORT/HOST). No --dir/--repo required: the host (e.g. a PaaS) supplies
 * the backend env, and lib/runtime/config.ts resolves it (falling back to the
 * production GitHub default when nothing is set).
 */
function runStart() {
  const port = String(parseInt(process.env.PORT, 10) || 3000)
  const host = process.env.HOST || process.env.HOSTNAME || '0.0.0.0'

  let servingLabel
  if (process.env.CICI_DIR) servingLabel = process.env.CICI_DIR
  else if (process.env.CICI_REPO) servingLabel = `${process.env.CICI_REPO}${process.env.CICI_TOKEN ? '' : ' (read-only)'}`
  else servingLabel = 'backend from environment'

  bootServer({ port, host, servingLabel })
}

/**
 * `cici build` — stage cici's prebuilt Next output into the CONSUMER's current
 * directory so a host (e.g. Vercel) can serve the content repo with cici's tooling.
 *
 * cici publishes its prebuilt standalone server; a content repo doesn't rebuild
 * Next itself — it just needs cici's compiled output copied alongside its content.
 * We copy the three deployable artifacts into the cwd:
 *   <cici>/.next/standalone → <cwd>/.next/standalone
 *   <cici>/.next/static     → <cwd>/.next/static
 *   <cici>/public           → <cwd>/public
 */
function runBuild() {
  const server = serverPath()
  if (!fs.existsSync(server)) {
    fail(
      'cannot build: cici has no prebuilt server (.next/standalone/server.js).\n' +
      '  This normally ships inside the installed `cici` package. If you are running\n' +
      '  from source, build it first with `npm run build:cli`.'
    )
  }

  const cwd = process.cwd()
  const copies = [
    { from: path.join(CICI_ROOT, '.next', 'standalone'), to: path.join(cwd, '.next', 'standalone') },
    { from: path.join(CICI_ROOT, '.next', 'static'), to: path.join(cwd, '.next', 'static') },
    { from: path.join(CICI_ROOT, 'public'), to: path.join(cwd, 'public') },
  ]

  const done = []
  for (const { from, to } of copies) {
    if (!fs.existsSync(from)) continue
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.rmSync(to, { recursive: true, force: true })
    fs.cpSync(from, to, { recursive: true })
    done.push(path.relative(cwd, to) || to)
  }

  process.stdout.write(
    `\n  cici ${pkg.version} build\n` +
    `  staged cici's prebuilt output into ${cwd}\n` +
    (done.length ? done.map((d) => `    ✓ ${d}\n`).join('') : '    (nothing to copy)\n') +
    `\n  A host can now serve this directory (server entry: .next/standalone/server.js).\n\n`
  )
}

/** Default command: serve a --dir or --repo target from CLI options. */
function runServe(args) {
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

  bootServer({ port, host, servingLabel })
}

function main() {
  // Detect subcommands before option parsing.
  const cmd = process.argv[2]
  if (cmd === 'start') { runStart(); return }
  if (cmd === 'build') { runBuild(); return }

  const args = parseArgs(process.argv.slice(2))
  if (args.help) { printHelp(); return }
  if (args.version) { process.stdout.write(`${pkg.version}\n`); return }

  runServe(args)
}

main()
