import { DiscussionServer, type ExternalDiscussion } from 'discussing'

interface ExternalCommentsServerProps {
  discussions?: ExternalDiscussion[]
  className?: string
}

// React Server Component wrapper using the package
export default async function ExternalCommentsServerWrapper({ 
  discussions = [], 
  className = '' 
}: ExternalCommentsServerProps) {
  return (
    <DiscussionServer
      discussions={discussions}
      className={className}
      fetchOptions={{ cacheTimeout: 300 }}
    />
  )
}