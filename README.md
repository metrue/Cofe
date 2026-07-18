# Cofe

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
git clone https://github.com/metrue/Cofe.git
cd Cofe && npm install && npm run dev
```

**That's it.** Visit `localhost:3000`, sign in with GitHub, start writing.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/metrue/Cofe)

## Run it locally with `npx` (no GitHub, no deploy)

Point Cofe at a folder of your own content and it serves — and edits — everything
straight from disk. No sign-in, no server, no Vercel.

```bash
npx cofe --data ~/my-blog        # → http://localhost:3000
npx cofe --data ~/my-blog --port 4000
```

Your `--data` folder is the content root:

```
my-blog/
  blog/            # one <slug>.md per post (front-matter + markdown)
  memos.json       # your memos
  site-config.json # optional site settings
  assets/          # images uploaded from the editor land here
```

Open `/editor` to write posts and memos — everything you create or edit is written
back into that folder as plain files you own. Empty folder? It starts blank; create
your first post in the editor.

## Documentation

**[→ Complete Cofe Guide](/blog/cofe)** - Everything you need in one place:

- Quick start & GitHub OAuth setup
- Customization & analytics integration  
- API reference & GraphQL queries
- Deployment & performance tips
- Migration from other platforms
- Troubleshooting & best practices


## Screenshots

![Home Desktop](https://github.com/metrue/cofe/blob/main/assets/images/home_desktop.png?raw=true)

![Memos Desktop](https://github.com/metrue/cofe/blob/main/assets/images/memos_desktop.png?raw=true)

![Memo Editor](https://github.com/metrue/cofe/blob/main/assets/images/memo_editor.png?raw=true)