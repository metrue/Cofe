import { DiscussionServer, Discussion, type ExternalDiscussion } from 'discussing'

interface ExternalCommentsDemoProps {
  discussions?: ExternalDiscussion[]
  className?: string
  useServerComponent?: boolean
  enableRefresh?: boolean
}

/**
 * Demo component showing clean import usage
 * 
 * In production, you would simply install:
 * npm install external-comments-react
 * 
 * Then import and use like this component shows
 */
export default function ExternalCommentsDemo({ 
  discussions = [], 
  className = '',
  useServerComponent = true,
  enableRefresh = false
}: ExternalCommentsDemoProps) {
  // Server Component (Recommended) - Maximum Performance
  if (useServerComponent) {
    return (
      <DiscussionServer
        discussions={discussions}
        className={className}
        fetchOptions={{
          cacheTimeout: 300, // 5 minutes
          userAgent: 'Cofe Blog Comments'
        }}
      />
    )
  }

  // Client Component - Dynamic Features
  return (
    <Discussion
      discussions={discussions}
      className={className}
      enableRefresh={enableRefresh}
      refreshInterval={300} // 5 minutes auto-refresh
      fetchOptions={{
        cacheTimeout: 300,
        userAgent: 'Cofe Blog Comments'
      }}
    />
  )
}

// Example usage in your blog posts:
/*
// For maximum performance (Server Component):
<ExternalCommentsDemo 
  discussions={[
    { platform: 'hackernews', url: 'https://news.ycombinator.com/item?id=123456' },
    { platform: 'reddit', url: 'https://www.reddit.com/r/programming/comments/abc123/my_post/' }
  ]}
  useServerComponent={true}
/>

// For dynamic features (Client Component):
<ExternalCommentsDemo 
  discussions={discussions}
  useServerComponent={false}
  enableRefresh={true}
/>
*/