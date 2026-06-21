# Cofe (blog.minghe.me) — AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Pi, Codex, OpenCode, etc.) when working with the Cofe blog app codebase.

## Overview

**Cofe** is a Next.js blog and memo app powering [blog.minghe.me](https://blog.minghe.me). Content is stored in the repo itself (`data/blog/`, `data/memos/`) and rendered as static pages. GitHub OAuth for auth, i18n via `next-intl`.

- **Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI
- **Auth**: GitHub OAuth (next-auth/Auth.js)
- **i18n**: next-intl (Chinese + English)
- **Testing**: Jest
- **Deploy**: Vercel (auto-deploy on push to main)

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run test         # Jest test suite
npm run test:watch   # Jest in watch mode
npm run test:coverage # Jest coverage report
```

## Architecture

```
blog.minghe.me/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (GraphQL proxy, GitHub, RSS)
│   ├── blog/               # Blog post pages
│   ├── editor/             # Post/memo editor (authenticated)
│   ├── memos/              # Memo listing
│   └── layout.tsx          # Root layout with auth + i18n
├── components/             # React components (shadcn/ui patterns)
│   ├── ui/                 # Primitive UI components (button, dialog, etc.)
│   └── *.tsx               # Feature components (BlogCard, Editor, etc.)
├── data/                   # Static content (stored in git)
│   ├── blog/               # Blog posts as .md files
│   └── memos/              # Memos as .md files
├── hooks/                  # Custom React hooks
├── i18n/                   # next-intl locale files (en, zh)
├── lib/                    # Utilities (GitHub API client, parsing)
└── public/                 # Static assets
```

## Key Patterns

- **Content is code**: Blog posts and memos live as `.md` files in `data/`. Editing content = editing files in the repo.
- **GitHub API**: Posts use GitHub's REST API for storage (octokit). Memos use GraphQL for queries.
- **No database**: Everything is file-based or GitHub-backed. No persistence layer beyond the repo.

## Gotchas

- **Editor auth**: The editor at `/editor` requires GitHub OAuth login. Test locally with `npm run dev` and visit `localhost:3000/editor`.
- **RSS/Atom feeds**: Generated at build time from `data/blog/`. New posts need a build to appear in feeds.
- **Static content formatting**: Blog posts in `data/blog/` follow a specific frontmatter format — check existing posts before adding new ones.
