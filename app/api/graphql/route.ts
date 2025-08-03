import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createGitHubAPIClient } from '@/lib/client'
import { createPublicGitHubClient } from '@/lib/publicClient'
import { Memo } from '@/lib/types'

// GraphQL resolver context type
interface GraphQLContext {
  token?: {
    accessToken?: string
    login?: string
    name?: string
  } | null
}

// GraphQL resolver types
type QueryResolvers = {
  memos: (parent: unknown, args: unknown, context: GraphQLContext) => Promise<Memo[]>
}

type MutationResolvers = {
  createMemo: (
    parent: unknown, 
    args: { input: { content: string; image?: string } }, 
    context: GraphQLContext
  ) => Promise<Memo>
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

  type Query {
    memos: [Memo!]!
  }

  type Mutation {
    createMemo(input: CreateMemoInput!): Memo!
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
        
        try {
          // Get current file to get its SHA
          const currentFile = await octokit.repos.getContent({
            owner: context.token.login || context.token.name || '',
            repo: 'Cofe',
            path: 'data/memos.json',
          })

          if (!Array.isArray(currentFile.data) && 'sha' in currentFile.data) {
            // Update the file
            await octokit.repos.createOrUpdateFileContents({
              owner: context.token.login || context.token.name || '',
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
              owner: context.token.login || context.token.name || '',
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