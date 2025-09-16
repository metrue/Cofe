// The discussing package now provides the complete route handler!
// This eliminates all the boilerplate code and keeps your app clean.
export { discussionRouteHandler as GET } from 'discussing'

// That's it! The discussing package handles:
// - Parameter validation
// - Platform checking  
// - Fetching comments
// - Error handling
// - Cache headers
// - CORS proxy functionality