// Option 2: Custom configuration
import { createCommentHandler } from 'discussing'

// Create a custom handler with your own cache settings
export const GET = createCommentHandler({
  cacheControl: 'public, s-maxage=600', // Cache for 10 minutes
  allowedPlatforms: ['v2ex', 'reddit', 'hackernews']
})