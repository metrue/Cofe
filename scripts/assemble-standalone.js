#!/usr/bin/env node
/**
 * Next.js `output: 'standalone'` emits a self-contained server at
 * `.next/standalone/server.js` but does NOT copy the static assets or the
 * `public/` folder into it (Next documents this as a manual step). This script
 * copies them in so the packaged CLI serves CSS/JS/images correctly.
 *
 * Run after `next build`:  node scripts/assemble-standalone.js
 */

'use strict'

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const standalone = path.join(root, '.next', 'standalone')

function assertExists(p, hint) {
  if (!fs.existsSync(p)) {
    console.error(`assemble-standalone: missing ${p}\n${hint}`)
    process.exit(1)
  }
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return false
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.cpSync(from, to, { recursive: true })
  return true
}

assertExists(standalone, 'Run `next build` with output:"standalone" first.')

// .next/static → .next/standalone/.next/static
const staticCopied = copyDir(
  path.join(root, '.next', 'static'),
  path.join(standalone, '.next', 'static')
)

// public → .next/standalone/public
const publicCopied = copyDir(
  path.join(root, 'public'),
  path.join(standalone, 'public')
)

console.log(
  `assemble-standalone: ${staticCopied ? 'copied .next/static' : 'no .next/static'}, ` +
  `${publicCopied ? 'copied public/' : 'no public/'}`
)
