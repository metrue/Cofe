import { DiscussionServer, type ExternalDiscussion } from 'discussing'
import { headers } from 'next/headers'

interface BlogDiscussionsProps {
  discussions?: ExternalDiscussion[]
}

/**
 * Server component for rendering external discussions
 * Fetches comments on the server, no API route needed!
 */
export default async function BlogDiscussions({ discussions }: BlogDiscussionsProps) {
  if (!discussions || discussions.length === 0) {
    return null
  }

  // Get the client's User-Agent from the request headers
  const headersList = headers()
  const userAgent = headersList.get('user-agent') || 'Mozilla/5.0 (compatible; Blog Comment Fetcher)'

  return (
    <DiscussionServer
      discussions={discussions}
      className="mt-8 pt-6 border-t border-gray-100"
      fetchOptions={{ 
        cacheTimeout: 300,
        userAgent
      }}
    />
  )
}