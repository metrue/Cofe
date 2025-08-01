// Setup fetch polyfill
require('whatwg-fetch')

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
      headers: options?.headers || {},
    })),
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock @octokit/rest
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(() => ({
    users: {
      getAuthenticated: jest.fn(),
    },
    repos: {
      getContent: jest.fn(),
      createOrUpdateFileContents: jest.fn(),
      deleteFile: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      createForAuthenticatedUser: jest.fn(),
    },
  })),
}))

// Setup global fetch mock
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

// Setup environment variables for tests
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.GITHUB_CLIENT_ID = 'test-client-id'
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret'