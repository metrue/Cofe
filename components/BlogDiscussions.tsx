import { DiscussionServer, type ExternalDiscussion } from 'discussing'
import { headers } from 'next/headers'

interface BlogDiscussionsProps {
  discussions?: ExternalDiscussion[]
}

// Helper function to detect server-like User-Agents that Reddit blocks
function isServerUserAgent(userAgent: string): boolean {
  const serverPatterns = [
    'curl/',
    'undici',
    'node-fetch',
    'axios/',
    'python-requests',
    'Go-http-client',
    'Java/',
    'okhttp',
    'Wget/',
    'Bot',
    'crawler',
    'spider'
  ]
  
  const lowerUA = userAgent.toLowerCase()
  return serverPatterns.some(pattern => lowerUA.includes(pattern.toLowerCase()))
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
  const clientUserAgent = headersList.get('user-agent')
  
  // Use a convincing browser User-Agent fallback for cases where client UA is missing or blocked
  // Reddit specifically blocks server-like User-Agents (curl, undici, etc.)
  const userAgent = clientUserAgent && !isServerUserAgent(clientUserAgent) 
    ? clientUserAgent 
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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