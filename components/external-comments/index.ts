// Hybrid export for both client and server components
export { default as ExternalComments } from '../ExternalComments'
export { default as ExternalCommentsServer } from '../ExternalCommentsServer'

// Re-export types and utilities
export type { ExternalDiscussion, Comment } from '../../lib/external-comments'
export { 
  fetchCommentsForPlatform, 
  fetchAllExternalComments,
  fetchV2exComments,
  fetchRedditComments,
  fetchHackerNewsComments
} from '../../lib/external-comments'