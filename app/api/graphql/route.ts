import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createSmartClient } from '@/lib/smartClient'
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
        const client = createSmartClient()
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
        const client = createSmartClient()
        const likesData = await client.getLikes()
        
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
      // In development, allow memo creation without authentication for testing
      if (process.env.NODE_ENV !== 'development' && !context.token?.accessToken) {
        throw new Error('Authentication required')
      }

      try {
        const newMemo: Memo = {
          id: Date.now().toString(),
          content: input.content,
          timestamp: new Date().toISOString(),
          ...(input.image && { image: input.image })
        }

        const client = createSmartClient(context.token?.accessToken)
        return await client.createMemo(newMemo)
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
        
        // Get likes data using smart client
        const client = createSmartClient(context.token?.accessToken)
        let likesData = await client.getLikes()
        
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
        
        // Update likes data using smart client
        await client.updateLikes(likesData)
        
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