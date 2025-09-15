# External Comments Components

A React component library for fetching and displaying comments from external discussion platforms including V2EX, Reddit, and Hacker News.

## Features

- 🚀 **React Server Components** support for better performance
- 🔄 **Client Components** for backward compatibility
- 📦 **TypeScript** first with full type definitions
- 🎯 **Platform support**: V2EX, Reddit, Hacker News
- ⚡ **Built-in caching** with Next.js revalidation
- 🎨 **Customizable styling** with Tailwind CSS

## Installation

```bash
npm install external-comments-react
# or
yarn add external-comments-react
```

## Usage

### Server Component (Recommended)

Use the server component for better performance and SEO:

```tsx
import { ExternalCommentsServer } from 'external-comments-react'

export default function BlogPost() {
  const discussions = [
    {
      platform: 'hackernews' as const,
      url: 'https://news.ycombinator.com/item?id=123456'
    },
    {
      platform: 'reddit' as const,
      url: 'https://www.reddit.com/r/programming/comments/abc123/my_post/'
    }
  ]

  return (
    <article>
      <h1>My Blog Post</h1>
      <p>Content...</p>
      
      {/* Comments will be rendered server-side */}
      <ExternalCommentsServer discussions={discussions} />
    </article>
  )
}
```

### Client Component (Legacy Support)

Use the client component for more dynamic behavior:

```tsx
'use client'

import { ExternalComments } from 'external-comments-react'

export default function BlogPost() {
  const discussions = [
    {
      platform: 'v2ex' as const,
      url: 'https://www.v2ex.com/t/123456'
    }
  ]

  return (
    <article>
      <h1>My Blog Post</h1>
      <p>Content...</p>
      
      {/* Comments will be fetched client-side */}
      <ExternalComments discussions={discussions} />
    </article>
  )
}
```

## API Reference

### Props

Both components accept the same props:

```tsx
interface ExternalCommentsProps {
  discussions?: ExternalDiscussion[]
  className?: string
}

interface ExternalDiscussion {
  platform: 'v2ex' | 'reddit' | 'hackernews'
  url: string
}
```

### Advanced Usage

You can also use the utility functions directly:

```tsx
import { fetchCommentsForPlatform, fetchAllExternalComments } from 'external-comments-react'

// Fetch comments for a single platform
const comments = await fetchCommentsForPlatform({
  platform: 'hackernews',
  url: 'https://news.ycombinator.com/item?id=123456'
})

// Fetch comments for multiple platforms
const allComments = await fetchAllExternalComments([
  { platform: 'hackernews', url: 'https://news.ycombinator.com/item?id=123456' },
  { platform: 'reddit', url: 'https://www.reddit.com/r/programming/comments/abc123/' }
])
```

## Styling

The components use Tailwind CSS classes by default. You can customize the appearance by:

1. **Custom className**: Pass a `className` prop to override default styles
2. **CSS overrides**: Target the component classes in your CSS
3. **Component wrapping**: Wrap the component in your own styled container

## Platform Support

| Platform | URL Format | Features |
|----------|------------|----------|
| Hacker News | `https://news.ycombinator.com/item?id=123456` | ✅ Comments, ✅ Replies, ✅ Scores |
| Reddit | `https://www.reddit.com/r/subreddit/comments/abc123/title/` | ✅ Comments, ✅ Replies, ✅ Scores |
| V2EX | `https://www.v2ex.com/t/123456` | ✅ Comments, ❌ Replies, ❌ Scores |

## Performance

### Server Component Benefits
- **Zero JavaScript**: Comment fetching logic doesn't increase bundle size
- **Better SEO**: Comments are included in initial HTML
- **Faster loading**: Comments appear immediately without loading states
- **Caching**: Built-in Next.js cache with 5-minute revalidation

### Client Component Benefits
- **Dynamic updates**: Comments can be refetched without page reload
- **Progressive enhancement**: Works with any React setup
- **User interactions**: Can implement features like comment refresh

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.