import GithubProvider from "next-auth/providers/github"
import { NextAuthOptions } from "next-auth"
import { Session } from "next-auth"
import { getServerSession } from "next-auth/next"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    expires: string
  }
}

export async function getSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions) as Session | null
  if (!session) {
    console.log('No session found')
    return null
  }
  if (!session.accessToken) {
    console.log('Session found, but no access token')
  } else {
    console.log('Session found with access token')
  }
  return session
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'public_repo workflow'
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account && account.access_token) {
        token.accessToken = account.access_token
      }
      if (account) {
        token.username = account.username
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      if (session.user) {
        session.user.name = token.username as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}
