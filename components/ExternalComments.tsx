import { Discussion, type ExternalDiscussion } from 'discussing'

interface ExternalCommentsProps {
  discussions?: ExternalDiscussion[]
  className?: string
}

export default function ExternalCommentsWrapper({ discussions = [], className = '' }: ExternalCommentsProps) {
  return (
    <Discussion
      discussions={discussions}
      className={className}
      enableRefresh={true}
      refreshInterval={300}
    />
  )
}