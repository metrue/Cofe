## Cofe

Cofe is designed to be a simple and easy-to-use blog and memo taking app, originally forked from [tinymind](https://github.com/mazzzystar/tinymind).

![screnshot](https://github.com/metrue/cofe/blob/main/data/assets/images/Cofe-app.png?raw=true)

### Features

- 📝 Blog posts with markdown support
- 💭 Quick memo taking
- 🔐 GitHub OAuth authentication
- 📱 **GraphQL API for mobile apps**
- 🚀 Vercel deployment ready
- ⚡ Rate limit optimized with public GitHub URLs

### GraphQL API

Cofe provides a GraphQL API at `/api/graphql` for external applications (like iOS/Android apps):

- **Queries** (public access): Fetch blog posts and memos
- **Mutations** (authenticated): Create, update, delete memos

For detailed API documentation, see [docs/API.md](./docs/API.md).

### HOW TO RUN

Register a new OAuth App on Github, and get the `GITHUB_ID` and `GITHUB_SECRET`,
then run the following command to start the blog:

```bash
 GITHUB_USERNAME='metrue' GITHUB_ID='GITHUB_ID'   GITHUB_SECRET='GITHUB_SECRET' NEXTAUTH_SECRET='NEXTAUTH_SECRET' npm run dev
```
