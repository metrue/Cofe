import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createSmartClient } from '@/lib/smartClient'
import { Memo, BlogPost, Link, ExternalDiscussion } from '@/lib/types'
import { createBlogPost, updateBlogPost, deleteBlogPost, updateMemo, deleteMemo } from '@/lib/githubApi'
import { 
  getClientIP, 
  getLocationFromHeaders, 
  hashIP, 
  generateLikeId, 
  hasUserLiked, 
  getLikeInfo, 
  createItemKey,
  createUserFingerprint,
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
  getLikes: (parent: unknown, args: { itemType: string; id: string }, context: GraphQLContext) => Promise<LikeInfo>
  blogPosts: (parent: unknown, args: unknown, context: GraphQLContext) => Promise<BlogPost[]>
  blogPost: (parent: unknown, args: { id: string }, context: GraphQLContext) => Promise<BlogPost | null>
  links: (parent: unknown, args: unknown, context: GraphQLContext) => Promise<Link[]>
}

type MutationResolvers = {
  createMemo: (
    parent: unknown, 
    args: { input: { content: string; image?: string; latitude?: number; longitude?: number; city?: string; street?: string } }, 
    context: GraphQLContext
  ) => Promise<Memo>
  updateMemo: (
    parent: unknown,
    args: { id: string; input: { content: string; image?: string } },
    context: GraphQLContext
  ) => Promise<Memo>
  deleteMemo: (
    parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ) => Promise<boolean>
  toggleLike: (
    parent: unknown,
    args: { itemType: string; id: string },
    context: GraphQLContext
  ) => Promise<LikeResult>
  createBlogPost: (
    parent: unknown,
    args: { input: { title: string; content: string; discussions?: ExternalDiscussion[]; latitude?: number; longitude?: number; city?: string; street?: string } },
    context: GraphQLContext
  ) => Promise<BlogPost>
  updateBlogPost: (
    parent: unknown,
    args: { id: string; input: { title: string; content: string; discussions?: ExternalDiscussion[] } },
    context: GraphQLContext
  ) => Promise<BlogPost>
  deleteBlogPost: (
    parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ) => Promise<boolean>
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
    latitude: Float
    longitude: Float
    city: String
    street: String
  }

  type Discussion {
    platform: String!
    url: String!
    title: String
    count: Int
  }

  type BlogPost {
    id: String!
    title: String!
    content: String!
    date: String!
    discussions: [Discussion]
    latitude: Float
    longitude: Float
    city: String
    street: String
  }

  type Link {
    id: String!
    title: String!
    url: String!
    description: String
    tags: [String]
  }

  input CreateMemoInput {
    content: String!
    image: String
    latitude: Float
    longitude: Float
    city: String
    street: String
  }

  input UpdateMemoInput {
    content: String!
    image: String
  }

  input CreateBlogPostInput {
    title: String!
    content: String!
    discussions: [DiscussionInput]
    latitude: Float
    longitude: Float
    city: String
    street: String
  }

  input UpdateBlogPostInput {
    title: String!
    content: String!
    discussions: [DiscussionInput]
  }

  input DiscussionInput {
    platform: String!
    url: String!
    title: String
    count: Int
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
    getLikes(itemType: String!, id: String!): LikeInfo!
    blogPosts: [BlogPost!]!
    blogPost(id: String!): BlogPost
    links: [Link!]!
  }

  type Mutation {
    createMemo(input: CreateMemoInput!): Memo!
    updateMemo(id: String!, input: UpdateMemoInput!): Memo!
    deleteMemo(id: String!): Boolean!
    toggleLike(itemType: String!, id: String!): LikeResult!
    createBlogPost(input: CreateBlogPostInput!): BlogPost!
    updateBlogPost(id: String!, input: UpdateBlogPostInput!): BlogPost!
    deleteBlogPost(id: String!): Boolean!
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
    getLikes: async (_parent, { itemType, id }, context) => {
      try {
        const client = createSmartClient()
        const likesData = await client.getLikes()
        
        console.log('getLikes - fetched data:', JSON.stringify(likesData, null, 2))
        
        const ip = getClientIP(context.request)
        const location = getLocationFromHeaders(context.request)
        const hashedIP = hashIP(ip)
        const userFingerprint = createUserFingerprint(hashedIP, location)
        
        const itemKey = createItemKey(itemType as 'blog' | 'memo', id)
        const likeInfo = getLikeInfo(likesData, itemKey, userFingerprint)
        
        console.log('getLikes - computed like info:', JSON.stringify(likeInfo, null, 2))
        
        return likeInfo
      } catch (error) {
        console.error('Error fetching likes:', error)
        return { count: 0, countries: [], userLiked: false }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blogPosts: async (_parent, _args, context) => {
      try {
        const client = createSmartClient(context.token?.accessToken)
        const result = await client.getBlogPosts()
        return Array.isArray(result) ? result : []
      } catch (error) {
        console.error('Error fetching blog posts:', error)
        return []
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blogPost: async (_parent, { id }, context) => {
      try {
        const client = createSmartClient(context.token?.accessToken)
        const post = await client.getBlogPost(`${id}.md`)
        return post || null
      } catch (error) {
        console.error('Error fetching blog post:', error)
        return null
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    links: async (_parent, _args, context) => {
      try {
        const client = createSmartClient(context.token?.accessToken)
        const result = await client.getLinks()
        return Array.isArray(result) ? result : []
      } catch (error) {
        console.error('Error fetching links:', error)
        return []
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
          ...(input.image && { image: input.image }),
          ...(input.latitude && { latitude: input.latitude }),
          ...(input.longitude && { longitude: input.longitude }),
          ...(input.city && { city: input.city }),
          ...(input.street && { street: input.street })
        }

        const client = createSmartClient(context.token?.accessToken)
        return await client.createMemo(newMemo)
      } catch (error) {
        console.error('Error creating memo:', error)
        throw new Error('Failed to create memo')
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toggleLike: async (_parent, { itemType, id }, context) => {
      try {
        // Get user's IP and location
        const ip = getClientIP(context.request)
        const location = getLocationFromHeaders(context.request)
        const hashedIP = hashIP(ip)
        const userFingerprint = createUserFingerprint(hashedIP, location)
        
        // Get likes data using smart client
        const client = createSmartClient(context.token?.accessToken)
        let likesData = await client.getLikes()
        
        console.log('toggleLike - original likes data:', JSON.stringify(likesData, null, 2))
        
        // Create a mutable copy since we need to modify it
        likesData = { ...likesData }
        
        const itemKey = createItemKey(itemType as 'blog' | 'memo', id)
        const timestamp = new Date().toISOString()
        
        console.log('toggleLike - itemKey:', itemKey, 'userFingerprint:', userFingerprint)
        
        // Check if user has already liked
        const { hasLiked, existingLikeId } = hasUserLiked(likesData, itemKey, userFingerprint)
        
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
          const likeId = generateLikeId(userFingerprint, timestamp)
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
        
        console.log('toggleLike - likes data before update:', JSON.stringify(likesData, null, 2))
        
        // Update likes data using smart client
        await client.updateLikes(likesData)
        
        // Calculate final result
        const finalLikeInfo = getLikeInfo(likesData, itemKey, userFingerprint)
        
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateMemo: async (_parent, { id, input }, context) => {
      if (!context.token?.accessToken) {
        throw new Error('Authentication required')
      }

      try {
        await updateMemo(id, input.content, context.token.accessToken)
        // Return the updated memo
        const client = createSmartClient(context.token.accessToken)
        const memos = await client.getMemos()
        const updatedMemo = Array.isArray(memos) ? memos.find(m => m.id === id) : null
        if (!updatedMemo) {
          throw new Error('Memo not found after update')
        }
        return updatedMemo
      } catch (error) {
        console.error('Error updating memo:', error)
        throw new Error('Failed to update memo')
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deleteMemo: async (_parent, { id }, context) => {
      if (!context.token?.accessToken) {
        throw new Error('Authentication required')
      }

      try {
        await deleteMemo(id, context.token.accessToken)
        return true
      } catch (error) {
        console.error('Error deleting memo:', error)
        throw new Error('Failed to delete memo')
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createBlogPost: async (_parent, { input }, context) => {
      if (!context.token?.accessToken) {
        throw new Error('Authentication required')
      }

      try {
        const location = {
          latitude: input.latitude,
          longitude: input.longitude,
          city: input.city,
          street: input.street
        }
        await createBlogPost(input.title, input.content, context.token.accessToken, input.discussions, location)
        // Return the created blog post
        const client = createSmartClient(context.token.accessToken)
        const posts = await client.getBlogPosts()
        const createdPost = Array.isArray(posts) ? posts.find(p => p.title === input.title) : null
        if (!createdPost) {
          throw new Error('Blog post not found after creation')
        }
        return createdPost
      } catch (error) {
        console.error('Error creating blog post:', error)
        throw new Error('Failed to create blog post')
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateBlogPost: async (_parent, { id, input }, context) => {
      if (!context.token?.accessToken) {
        throw new Error('Authentication required')
      }

      try {
        await updateBlogPost(id, input.title, input.content, context.token.accessToken, input.discussions)
        // Return the updated blog post
        const client = createSmartClient(context.token.accessToken)
        const post = await client.getBlogPost(`${id}.md`)
        if (!post) {
          throw new Error('Blog post not found after update')
        }
        return post
      } catch (error) {
        console.error('Error updating blog post:', error)
        throw new Error('Failed to update blog post')
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deleteBlogPost: async (_parent, { id }, context) => {
      if (!context.token?.accessToken) {
        throw new Error('Authentication required')
      }

      try {
        await deleteBlogPost(id, context.token.accessToken)
        return true
      } catch (error) {
        console.error('Error deleting blog post:', error)
        throw new Error('Failed to delete blog post')
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