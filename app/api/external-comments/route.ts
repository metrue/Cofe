/**
 * This API route is required as a CORS proxy for the client-side Discussion component.
 * 
 * Why it's needed:
 * - Browsers block direct requests to external APIs (V2EX, Reddit, HN) due to CORS
 * - The Discussion component in BlogPostContent needs to fetch comments client-side
 * - This route acts as a server-side proxy to bypass CORS restrictions
 * 
 * The discussing package provides the complete handler implementation.
 */
export { discussionRouteHandler as GET } from 'discussing'