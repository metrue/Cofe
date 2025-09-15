# External Comments React

[![npm version](https://badge.fury.io/js/external-comments-react.svg)](https://badge.fury.io/js/external-comments-react)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A React component library for fetching and displaying comments from external discussion platforms like V2EX, Reddit, and Hacker News. Supports both React Server Components for optimal performance and traditional client components for dynamic functionality.

## Features

✅ **Multiple Platforms**: V2EX, Reddit, Hacker News  
⚡ **React Server Components**: Zero JavaScript bundle impact  
🔄 **Client Components**: Dynamic refresh and loading states  
🎨 **Customizable Styling**: Tailwind CSS classes with full customization  
📱 **Responsive Design**: Works great on all device sizes  
🔍 **SEO Friendly**: Server-rendered comments for better indexing  
🛡️ **Type Safe**: Full TypeScript support with comprehensive type definitions  
🧪 **Well Tested**: 100% test coverage with Jest

## Installation

```bash
npm install external-comments-react
# or
yarn add external-comments-react
# or
pnpm add external-comments-react
```

## Quick Start

### Server Component (Recommended)

For Next.js App Router with optimal performance:

```tsx
import { ExternalCommentsServer } from 'external-comments-react'
import Image from 'next/image'

export default async function BlogPost() {
  const discussions = [
    {
      platform: 'hackernews' as const,
      url: 'https://news.ycombinator.com/item?id=12345'
    },
    {
      platform: 'reddit' as const,
      url: 'https://reddit.com/r/programming/comments/abc123/'
    }
  ]

  return (
    <article>
      <h1>My Blog Post</h1>
      <p>Blog content here...</p>
      
      <ExternalCommentsServer
        discussions={discussions}
        ImageComponent={Image}
        fetchOptions={{ cacheTimeout: 300 }}
      />
    </article>
  )
}
```

### Client Component

For dynamic functionality and non-Next.js frameworks:

```tsx
'use client'

import { ExternalComments } from 'external-comments-react'
import { useState } from 'react'

export default function BlogPost() {
  const [discussions] = useState([
    {
      platform: 'v2ex' as const,
      url: 'https://v2ex.com/t/12345'
    }
  ])

  return (
    <article>
      <h1>My Blog Post</h1>
      <p>Blog content here...</p>
      
      <ExternalComments
        discussions={discussions}
        enableRefresh={true}
        refreshInterval={300}
      />
    </article>
  )
}
```

## Supported Platforms

| Platform | URL Format | Example |
|----------|------------|---------|
| **Hacker News** | `news.ycombinator.com/item?id={ID}` | `https://news.ycombinator.com/item?id=34567890` |
| **Reddit** | `reddit.com/r/{subreddit}/comments/{ID}/` | `https://reddit.com/r/programming/comments/abc123/` |
| **V2EX** | `v2ex.com/t/{ID}` | `https://v2ex.com/t/12345` |

## API Reference

### ExternalCommentsServer

React Server Component for optimal performance.

```tsx
interface ExternalCommentsServerProps {
  discussions?: ExternalDiscussion[]
  className?: string
  fetchOptions?: FetchOptions
  ImageComponent?: React.ComponentType<{
    src: string
    alt: string
    width?: number
    height?: number
    className?: string
  }>
}
```

**Benefits:**
- ✅ Zero JavaScript sent to client
- ✅ Comments render immediately with page load  
- ✅ Better SEO (comments in initial HTML)
- ✅ Server-side caching with Next.js revalidation

### ExternalComments

Client component for dynamic functionality.

```tsx
interface ExternalCommentsProps {
  discussions?: ExternalDiscussion[]
  className?: string
  fetchOptions?: FetchOptions
  ImageComponent?: React.ComponentType<{...}>
  enableRefresh?: boolean
  refreshInterval?: number
  apiEndpoint?: string
}
```

**Benefits:**
- ✅ Dynamic comment refresh without page reload
- ✅ Loading states and error handling
- ✅ Works with any React framework
- ✅ Auto-refresh functionality

### Types

```tsx
interface ExternalDiscussion {
  platform: 'v2ex' | 'reddit' | 'hackernews'
  url: string
}

interface FetchOptions {
  cacheTimeout?: number // Default: 300 seconds
  userAgent?: string    // Default: 'Mozilla/5.0 (compatible; Blog Comment Fetcher)'
}

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
  platform: string
  votes?: number
  avatar?: string
  replies?: Comment[]
}
```

## Advanced Usage

### Custom Styling

```tsx
<ExternalCommentsServer
  className="my-8 border-t border-gray-200 pt-8"
  discussions={discussions}
/>
```

### Custom Image Component

```tsx
import Image from 'next/image'

<ExternalCommentsServer
  ImageComponent={Image}
  discussions={discussions}
/>
```

### Caching Configuration

```tsx
<ExternalCommentsServer
  fetchOptions={{
    cacheTimeout: 600, // 10 minutes
    userAgent: 'MyBlog Bot 1.0'
  }}
  discussions={discussions}
/>
```

### Auto-refresh (Client Component)

```tsx
<ExternalComments
  enableRefresh={true}
  refreshInterval={300} // 5 minutes
  discussions={discussions}
/>
```

## Direct API Usage

For custom implementations:

```tsx
import { 
  fetchCommentsForPlatform,
  fetchAllExternalComments,
  fetchV2exComments,
  fetchRedditComments,
  fetchHackerNewsComments 
} from 'external-comments-react'

// Fetch comments from a single platform
const comments = await fetchCommentsForPlatform({
  platform: 'hackernews',
  url: 'https://news.ycombinator.com/item?id=12345'
})

// Fetch from multiple platforms
const allComments = await fetchAllExternalComments([
  { platform: 'reddit', url: 'https://reddit.com/r/test/comments/123/' },
  { platform: 'v2ex', url: 'https://v2ex.com/t/456' }
])

// Platform-specific functions
const hnComments = await fetchHackerNewsComments(
  'https://news.ycombinator.com/item?id=12345'
)
```

## Framework Integration

### Next.js App Router

Use `ExternalCommentsServer` for optimal performance:

```tsx
// app/blog/[slug]/page.tsx
import { ExternalCommentsServer } from 'external-comments-react'

export default async function BlogPage({ params }: { params: { slug: string } }) {
  const discussions = await getDiscussionsForPost(params.slug)
  
  return (
    <main>
      <BlogContent slug={params.slug} />
      <ExternalCommentsServer discussions={discussions} />
    </main>
  )
}
```

### Next.js Pages Router

Use the client component:

```tsx
// pages/blog/[slug].tsx
import { ExternalComments } from 'external-comments-react'

export default function BlogPage({ discussions }) {
  return (
    <main>
      <BlogContent />
      <ExternalComments discussions={discussions} />
    </main>
  )
}
```

## Performance

### Bundle Size
- **Server Component**: 0 KB (runs on server)
- **Client Component**: ~15 KB gzipped
- **Utilities only**: ~8 KB gzipped

### Caching
- **Next.js**: Automatic ISR with configurable revalidation
- **Standard fetch**: Relies on browser/CDN caching
- **Custom caching**: Implement your own with the utility functions

## Browser Support

- **Modern browsers**: Chrome 88+, Firefox 85+, Safari 14+
- **Node.js**: 16+ required for server components
- **React**: 18+ required

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `npm test`
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## License

MIT © [External Comments React](LICENSE)

## Changelog

### v1.0.0
- 🎉 Initial release
- ✅ React Server Component support
- ✅ V2EX, Reddit, Hacker News integration
- ✅ TypeScript support
- ✅ Comprehensive test suite