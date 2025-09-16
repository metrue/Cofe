import { DiscussionServer, type ExternalDiscussion } from 'discussing'

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

  return (
    <DiscussionServer
      discussions={discussions}
      className="mt-8 pt-6 border-t border-gray-100"
      fetchOptions={{ cacheTimeout: 300 }}
    />
  )
}