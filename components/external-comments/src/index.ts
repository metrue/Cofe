// Main exports for the external-comments-react package
export { default as ExternalComments } from './components/ExternalComments'
export { default as ExternalCommentsServer } from './components/ExternalCommentsServer'

// Utility functions for custom implementations
export { 
  fetchCommentsForPlatform, 
  fetchAllExternalComments,
  fetchV2exComments,
  fetchRedditComments,
  fetchHackerNewsComments
} from './utils/fetch-comments'

// Type definitions
export type { 
  Comment, 
  ExternalDiscussion, 
  FetchOptions 
} from './types'