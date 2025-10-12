---
title: The Complete Cofe Guide
date: 2025-10-06T10:30:00.000Z
status: draft
external_discussions:
  - platform: hackernews
    url: https://news.ycombinator.com/item?id=example
---


# The Complete Cofe Guide

**Everything you need to know about setting up, customizing, and mastering Cofe.**

Cofe is a beautifully simple blog and memo app that stores everything in your GitHub repository. No databases, no complex setups - just write and publish.

> **Live Example**: See Cofe in action at [blog.minghe.me](https://blog.minghe.me) - a real blog powered by Cofe.

## Quick Start

### 1. GitHub OAuth Setup

First, create a GitHub OAuth App:

1. Go to [GitHub Settings > Developer Settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: `Cofe Blog`
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Save your **Client ID** and **Client Secret**

### 2. Environment Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/metrue/Cofe.git
cd Cofe
npm install
```

Create your environment variables:

```bash
# Required for GitHub integration
export GITHUB_USERNAME='your-github-username'
export GITHUB_ID='your-github-oauth-client-id'
export GITHUB_SECRET='your-github-oauth-client-secret'

# Required for authentication
export NEXTAUTH_SECRET='your-random-secret-string'
export NEXTAUTH_URL='http://localhost:3000'

# Optional: Analytics (see Analytics section)
export NEXT_PUBLIC_ANALYTICS_ENABLED=false
```

### 3. Start Writing

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in with GitHub, and start creating!

## Core Features

### Blog Posts

Rich blog posts with full markdown support:

- **Markdown**: Standard and extended syntax
- **Code Highlighting**: Syntax highlighting for 100+ languages
- **Math**: LaTeX equations with KaTeX
- **Images**: Drag & drop or paste images
- **Location**: Automatic location tagging
- **Discussions**: Link external discussions from HN, Reddit, V2EX

### Quick Memos

Capture thoughts instantly:

- **Fast Entry**: One-click memo creation
- **Location Tracking**: Automatic location capture
- **Like System**: Engage with your content
- **Masonry Layout**: Beautiful responsive grid

### External Discussions

Connect your posts to external conversations:

```yaml
external_discussions:
  - platform: hackernews
    url: https://news.ycombinator.com/item?id=123456
  - platform: reddit
    url: https://reddit.com/r/programming/comments/xyz/
  - platform: v2ex
    url: https://v2ex.com/t/123456
```

Cofe automatically fetches and displays comment counts and links.

## Advanced Configuration

### Analytics Setup

Enable privacy-first analytics with Umami:

1. **Get Umami**: Sign up at [cloud.umami.is](https://cloud.umami.is) or [self-host](https://umami.is/docs)
2. **Create Website**: Add your domain and get the Website ID
3. **Configure Environment**:

```bash
export NEXT_PUBLIC_ANALYTICS_ENABLED=true
export NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id

# Optional: Custom Umami instance
export NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://your-umami.com/script.js

# Optional: Domain restrictions
export NEXT_PUBLIC_UMAMI_DOMAINS=yourdomain.com,www.yourdomain.com
```

### Site Configuration

Customize your site in `lib/siteConfig.ts`:

```typescript
export const getSiteConfig = () => ({
  title: 'Your Blog Name',
  description: 'Your blog description',
  author: {
    name: 'Your Name',
    email: 'your@email.com'
  },
  social: {
    twitter: 'yourusername',
    github: 'yourusername'
  },
  keywords: ['blog', 'tech', 'programming']
})
```

### Custom Styling

Cofe uses Tailwind CSS. Customize styles in:

- `app/globals.css` - Global styles
- `tailwind.config.js` - Tailwind configuration
- Individual components for specific customizations

## Content Management

### File Structure

Cofe stores content in your GitHub repository:

```
data/
├── blog/           # Blog posts (.md files)
├── memos.json      # All memos
├── links.json      # External links
└── likes.json      # Like data
```

### Blog Post Format

Blog posts use frontmatter:

```yaml
---
title: Your Post Title
date: 2025-10-06T10:30:00.000Z
latitude: 37.7749
longitude: -122.4194
city: San Francisco
street: Market Street
external_discussions:
  - platform: hackernews
    url: https://news.ycombinator.com/item?id=123
---

Your markdown content here...
```

### Memo Format

Memos are stored as JSON objects:

```json
{
  "id": "1728123456789",
  "content": "Your memo content with **markdown**",
  "timestamp": "2025-10-06T10:30:00.000Z",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "city": "San Francisco",
  "street": "Market Street"
}
```

## Deployment

### Vercel (Recommended)

1. **Deploy**: Click the deploy button or connect your GitHub repo
2. **Environment Variables**: Add all your environment variables
3. **Domain**: Configure your custom domain
4. **SSL**: Automatic HTTPS setup

### Other Platforms

Cofe works on any platform that supports Next.js:

- **Netlify**: Use the Next.js plugin
- **Railway**: Direct deployment support
- **DigitalOcean App Platform**: Node.js app
- **Self-hosted**: Docker or Node.js server

## API Reference

### GraphQL Endpoints

Cofe provides a GraphQL API at `/api/graphql`:

#### Queries

```graphql
# Get all blog posts
query {
  blogPosts {
    id
    title
    content
    date
    city
    street
  }
}

# Get specific blog post
query {
  blogPost(id: "post-id") {
    id
    title
    content
    discussions {
      platform
      url
      count
    }
  }
}

# Get all memos
query {
  memos {
    id
    content
    timestamp
    city
    street
  }
}

# Get like information
query {
  getLikes(itemType: "blog", id: "post-id") {
    count
    countries
    userLiked
  }
}
```

#### Mutations

```graphql
# Create blog post
mutation {
  createBlogPost(input: {
    title: "New Post"
    content: "Content here..."
    latitude: 37.7749
    longitude: -122.4194
    city: "San Francisco"
    street: "Market Street"
  }) {
    id
    title
  }
}

# Create memo
mutation {
  createMemo(input: {
    content: "Quick thought..."
    latitude: 37.7749
    longitude: -122.4194
    city: "San Francisco"
  }) {
    id
    content
  }
}

# Toggle like
mutation {
  toggleLike(itemType: "blog", id: "post-id") {
    liked
    count
    countries
  }
}
```

## Troubleshooting

### Common Issues

**Authentication not working?**
- Check your GitHub OAuth callback URL
- Verify NEXTAUTH_SECRET is set
- Ensure NEXTAUTH_URL matches your domain

**Images not loading?**
- Verify GitHub token has repo access
- Check image URLs are publicly accessible
- Ensure proper file permissions

**Build failures?**
- Run `npm run lint` and fix any issues
- Check `npx tsc --noEmit` for TypeScript errors
- Verify all environment variables are set

**Location not working?**
- Enable location permissions in browser
- Check HTTPS requirement for geolocation
- Verify network connectivity for reverse geocoding

### Getting Help

1. **Check Issues**: [GitHub Issues](https://github.com/metrue/Cofe/issues)
2. **Discussions**: Use the external discussions feature
3. **Contributing**: See [CLAUDE.md](./CLAUDE.md) for development guidelines

## Migration

### From Jekyll

1. Copy markdown files to `data/blog/`
2. Update frontmatter format
3. Move images to GitHub repository
4. Update image URLs

### From Hugo

1. Convert content to standard markdown
2. Update frontmatter dates to ISO format
3. Migrate static assets
4. Configure redirects if needed

### From Ghost/WordPress

1. Export content to markdown
2. Clean up HTML remnants
3. Convert featured images
4. Set up URL redirects

## Performance Tips

1. **Image Optimization**: Use WebP format when possible
2. **Caching**: Enable Vercel Edge Caching
3. **Analytics**: Use minimal tracking for better performance
4. **Content**: Keep memo count reasonable for faster loading

## Security

- **Authentication**: GitHub OAuth only
- **Data Storage**: Your GitHub repository
- **Privacy**: No external databases
- **Analytics**: Privacy-first Umami integration
- **HTTPS**: Required in production

---

**That's everything!** Cofe is designed to be simple yet powerful. Start with the basics and customize as you grow.

Questions? Open an issue or start a discussion. Happy writing! ☕
