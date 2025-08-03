import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createGitHubAPIClient } from '@/lib/client'
import { createPublicGitHubClient } from '@/lib/publicClient'
import { Memo } from '@/lib/types'

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

const resolvers = {
  Query: {
    memos: async (_: any, __: any, context: any) => {
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
    createMemo: async (_: any, { input }: { input: { content: string; image?: string } }, context: any) => {
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
            owner: context.token.login || context.token.name,
            repo: 'Cofe',
            path: 'data/memos.json',
          })

          if (!Array.isArray(currentFile.data) && 'sha' in currentFile.data) {
            // Update the file
            await octokit.repos.createOrUpdateFileContents({
              owner: context.token.login || context.token.name,
              repo: 'Cofe',
              path: 'data/memos.json',
              message: `Add new memo: ${newMemo.id}`,
              content: Buffer.from(JSON.stringify(updatedMemos, null, 2)).toString('base64'),
              sha: currentFile.data.sha,
            })
          }
        } catch (fileError) {
          // If file doesn't exist, create it
          if ((fileError as any)?.status === 404) {
            await octokit.repos.createOrUpdateFileContents({
              owner: context.token.login || context.token.name,
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
  context: async ({ request }: { request: NextRequest }) => {
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

export {
  yoga as GET,
  yoga as POST,
  yoga as OPTIONS,
}