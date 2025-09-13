import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createGitHubAPIClient } from '@/lib/client'
import { createPublicGitHubClient } from '@/lib/publicClient'
import { Memo } from '@/lib/types'
import { 
  getClientIP, 
  getLocationFromHeaders, 
  hashIP, 
  generateLikeId, 
  hasUserLiked, 
  getLikeInfo, 
  createItemKey,
  LikeData 
} from '@/lib/likeUtils'

// GraphQL resolver context type
interface GraphQLContext {
  token?: {
    accessToken?: string
    login?: string
    name?: string
  } | null
  request: NextRequest
}

// GraphQL resolver types
type QueryResolvers = {
  memos: (parent: unknown, args: unknown, context: GraphQLContext) => Promise<Memo[]>
  getLikes: (parent: unknown, args: { type: string; id: string }, context: GraphQLContext) => Promise<LikeInfo>
}

type MutationResolvers = {
  createMemo: (
    parent: unknown, 
    args: { input: { content: string; image?: string } }, 
    context: GraphQLContext
  ) => Promise<Memo>
  toggleLike: (
    parent: unknown,
    args: { type: string; id: string },
    context: GraphQLContext
  ) => Promise<LikeResult>
}

type LikeInfo = {
  count: number
  countries: string[]
  userLiked: boolean
}

type LikeResult = {
  liked: boolean
  count: number
  countries: string[]
}

const typeDefs = `
  type Memo {
    id: String!
    content: String!
    timestamp: String!
    image: String
  }

  input CreateMemoInput {
    content: String!
    image: String
  }

  type LikeInfo {
    count: Int!
    countries: [String!]!
    userLiked: Boolean!
  }

  type LikeResult {
    liked: Boolean!
    count: Int!
    countries: [String!]!
  }

  type Query {
    memos: [Memo!]!
    getLikes(type: String!, id: String!): LikeInfo!
  }

  type Mutation {
    createMemo(input: CreateMemoInput!): Memo!
    toggleLike(type: String!, id: String!): LikeResult!
  }
`

const resolvers: { Query: QueryResolvers; Mutation: MutationResolvers } = {
  Query: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    memos: async (_parent, _args, _context) => {
      try {
        // Use public client for queries - no authentication needed
        // Default to 'metrue' owner, but could be made configurable
        const client = createPublicGitHubClient('metrue')
        const result = await client.getMemos()
        return Array.isArray(result) ? result : []
      } catch (error) {
        console.error('Error fetching memos:', error)
        return []
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getLikes: async (_parent, { type, id }, context) => {
      try {
        const client = createPublicGitHubClient('metrue')
        const likesData = await client.getLikes()
        
        // Get user's IP and location for userLiked check
        const ip = getClientIP(context.request)
        const location = getLocationFromHeaders(context.request)
        const hashedIP = hashIP(ip)
        
        const itemKey = createItemKey(type as 'blog' | 'memo', id)
        const likeInfo = getLikeInfo(likesData, itemKey, hashedIP, location.country)
        
        return likeInfo
      } catch (error) {
        console.error('Error fetching likes:', error)
        return { count: 0, countries: [], userLiked: false }
      }
    },
  },
  Mutation: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createMemo: async (_parent, { input }, context) => {
      // Check authentication
      if (!context.token?.accessToken) {
        throw new Error('Authentication required')
      }

      try {
        const client = createGitHubAPIClient(context.token.accessToken)
        
        // Get current memos
        const memos = await client.getMemos() || []

        const newMemo: Memo = {
          id: Date.now().toString(),
          content: input.content,
          timestamp: new Date().toISOString(),
          ...(input.image && { image: input.image })
        }

        // Add new memo at the beginning
        const updatedMemos = [newMemo, ...memos]

        // Update memos.json via GitHub API
        const { Octokit } = await import('@octokit/rest')
        const octokit = new Octokit({ auth: context.token.accessToken })
        
        // Get the authenticated user's login (username, not display name)
        const { data: user } = await octokit.users.getAuthenticated()
        const owner = user.login // This is the actual GitHub username
        
        try {
          // Get current file to get its SHA
          const currentFile = await octokit.repos.getContent({
            owner,
            repo: 'Cofe',
            path: 'data/memos.json',
          })

          if (!Array.isArray(currentFile.data) && 'sha' in currentFile.data) {
            // Update the file
            await octokit.repos.createOrUpdateFileContents({
              owner,
              repo: 'Cofe',
              path: 'data/memos.json',
              message: `Add new memo: ${newMemo.id}`,
              content: Buffer.from(JSON.stringify(updatedMemos, null, 2)).toString('base64'),
              sha: currentFile.data.sha,
            })
          }
        } catch (fileError) {
          // If file doesn't exist, create it
          if ((fileError as Error & { status?: number })?.status === 404) {
            await octokit.repos.createOrUpdateFileContents({
              owner,
              repo: 'Cofe',
              path: 'data/memos.json',
              message: `Create memos.json with first memo: ${newMemo.id}`,
              content: Buffer.from(JSON.stringify(updatedMemos, null, 2)).toString('base64'),
            })
          } else {
            throw fileError
          }
        }

        return newMemo
      } catch (error) {
        console.error('Error creating memo:', error)
        throw new Error('Failed to create memo')
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toggleLike: async (_parent, { type, id }, context) => {
      try {
        // Get user's IP and location
        const ip = getClientIP(context.request)
        const location = getLocationFromHeaders(context.request)
        const hashedIP = hashIP(ip)
        
        // Use public client to read likes, then authenticated client to write
        const publicClient = createPublicGitHubClient('metrue')
        let likesData = await publicClient.getLikes()
        
        // Create a mutable copy since we need to modify it
        likesData = { ...likesData }
        
        const itemKey = createItemKey(type as 'blog' | 'memo', id)
        const timestamp = new Date().toISOString()
        
        // Check if user has already liked
        const { hasLiked, existingLikeId } = hasUserLiked(likesData, itemKey, hashedIP, location.country)
        
        if (hasLiked && existingLikeId) {
          // Remove like (toggle off)
          if (likesData[itemKey]) {
            delete likesData[itemKey][existingLikeId]
            
            // Clean up empty entries
            if (Object.keys(likesData[itemKey]).length === 0) {
              delete likesData[itemKey]
            }
          }
        } else {
          // Add like (toggle on)
          const likeId = generateLikeId(hashedIP, location.country, timestamp)
          const likeData: LikeData = {
            timestamp,
            userAgent: location.userAgent,
            country: location.country,
            language: location.language
          }
          
          if (!likesData[itemKey]) {
            likesData[itemKey] = {}
          }
          likesData[itemKey][likeId] = likeData
        }
        
        // Update likes data in GitHub (requires authentication for write operations)
        // For now, we'll use a service account or require authentication
        // This is a limitation that could be addressed with webhooks or background jobs
        const authenticatedClient = context.token?.accessToken 
          ? createGitHubAPIClient(context.token.accessToken)
          : null
          
        if (authenticatedClient) {
          await authenticatedClient.updateLikes(likesData)
        } else {
          // For now, if no auth token, we can't persist likes
          // In production, you might want to queue this operation or use a service account
          console.warn('No authentication token available for updating likes')
        }
        
        // Calculate final result
        const finalLikeInfo = getLikeInfo(likesData, itemKey, hashedIP, location.country)
        
        return {
          liked: finalLikeInfo.userLiked,
          count: finalLikeInfo.count,
          countries: finalLikeInfo.countries
        }
      } catch (error) {
        console.error('Error toggling like:', error)
        throw new Error('Failed to toggle like')
      }
    },
  },
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  context: async (context) => {
    const request = context.request as NextRequest
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
    })
    
    return {
      token,
      request,
    }
  },
  // CORS already handled by Next.js config
})

// Next.js App Router handlers
export async function GET(request: NextRequest) {
  return yoga.handle(request, {})
}

export async function POST(request: NextRequest) {
  return yoga.handle(request, {})
}

export async function OPTIONS(request: NextRequest) {
  return yoga.handle(request, {})
}