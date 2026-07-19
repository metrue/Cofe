# cici

A beautifully simple blog and memo app that just works.

Write thoughts. Share ideas. Let GitHub handle the rest. Originally inspired by [tinymind](https://github.com/mazzzystar/tinymind), now see it in action at [blog.minghe.me](https://blog.minghe.me).


## What You Get

- **Rich Blog Posts** - Markdown, syntax highlighting, math, images
- **Quick Memos** - Instant thoughts with location tagging  
- **Discussion Integration** - Auto-connect HN, Reddit, V2EX comments
- **GitHub Powered** - Your data, your control, always
- **Works Everywhere** - Mobile-first, lightning fast

## Get Started in 2 Minutes

```bash
git clone https://github.com/metrue/cici.git
cd cici && npm install && npm run dev
```

**That's it.** Visit `localhost:3000`, sign in with GitHub, start writing.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/metrue/cici)

## Run it anywhere with `npx` (no deploy)

cici has a runtime layer with two backends — **local files** and a **GitHub repo** —
behind one content contract. Point the CLI at either:

```bash
# Local folder — serve AND edit, straight from disk (no GitHub, no sign-in)
npx cici --dir ~/my-blog

# Any GitHub content repo — read-only viewer
npx cici --repo metrue/cici

# ...with a token, edit that repo too
npx cici --repo owner/name --token ghp_xxx --port 4000
```

The content contract (same for `--dir` and `--repo`):

```
<root>/
  blog/            # one <slug>.md per post (front-matter + markdown)
  memos.json       # your memos
  site-config.json # optional site settings
  likes.json       # optional
  highlights/      # optional, one <slug>.json per post
  assets/          # images uploaded from the editor land here (local mode)
```

When editing is available (local mode, or a GitHub repo with a token) open `/editor`
to write posts and memos — everything is written back through the provider: to disk
in `--dir` mode, or committed to the repo in `--repo --token` mode.

### Architecture

- **Runtime layer** (`lib/runtime/`): a `ContentProvider` interface with `LocalProvider`
  and `GitHubProvider` implementations; `getProvider()` is the single factory that picks
  one from `CICI_DIR` / `CICI_REPO` / `GITHUB_USERNAME`.
- **Render layer** (`app/`, `components/`): depends only on `getProvider()` — never on
  `fs` or Octokit directly.

## Documentation

**[→ Complete cici Guide](/blog/cofe)** - Everything you need in one place:

- Quick start & GitHub OAuth setup
- Customization & analytics integration  
- API reference & GraphQL queries
- Deployment & performance tips
- Migration from other platforms
- Troubleshooting & best practices


## Screenshots

![Home Desktop](https://github.com/metrue/cici/blob/main/assets/images/home_desktop.png?raw=true)

![Memos Desktop](https://github.com/metrue/cici/blob/main/assets/images/memos_desktop.png?raw=true)

![Memo Editor](https://github.com/metrue/cici/blob/main/assets/images/memo_editor.png?raw=true)