/**
 * Test utilities for simulating GitHub API rate limit scenarios
 */

// Simple test to make Jest happy
describe('rateLimitHelpers', () => {
  it('should provide utility functions', () => {
    expect(typeof createRateLimitError).toBe('function')
    expect(typeof createSecondaryRateLimitError).toBe('function')
  })
})

export interface RateLimitHeaders {
  'x-ratelimit-limit': string
  'x-ratelimit-remaining': string
  'x-ratelimit-reset': string
  'x-ratelimit-used': string
}

export interface GitHubRateLimitError extends Error {
  status: number
  response?: {
    status: number
    headers: RateLimitHeaders
    data?: {
      message: string
      documentation_url?: string
    }
  }
}

/**
 * Create a mock GitHub API rate limit error
 */
export function createRateLimitError(options: {
  remaining?: number
  resetTime?: number
  limit?: number
  used?: number
}): GitHubRateLimitError {
  const {
    remaining = 0,
    resetTime = Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    limit = 5000,
    used = limit,
  } = options

  const error = new Error(
    `API rate limit exceeded for your IP address. Please retry after ${new Date(
      resetTime * 1000
    ).toISOString()}`
  ) as GitHubRateLimitError

  error.status = 403
  error.response = {
    status: 403,
    headers: {
      'x-ratelimit-limit': limit.toString(),
      'x-ratelimit-remaining': remaining.toString(),
      'x-ratelimit-reset': resetTime.toString(),
      'x-ratelimit-used': used.toString(),
    },
    data: {
      message: 'API rate limit exceeded',
      documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
    },
  }

  return error
}

/**
 * Create a mock secondary rate limit error
 */
export function createSecondaryRateLimitError(): GitHubRateLimitError {
  const error = new Error(
    'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.'
  ) as GitHubRateLimitError

  error.status = 403
  error.response = {
    status: 403,
    headers: {
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString(),
      'x-ratelimit-used': '1',
    },
    data: {
      message: 'You have exceeded a secondary rate limit',
      documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits',
    },
  }

  return error
}

/**
 * Mock fetch to simulate rate limit responses
 */
export function mockFetchWithRateLimit(scenario: 'success' | 'rate-limit' | 'network-error' | 'intermittent') {
  const originalFetch = global.fetch

  switch (scenario) {
    case 'success':
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve(''),
      })
      break

    case 'rate-limit':
      ;(global.fetch as jest.Mock).mockRejectedValue(createRateLimitError({}))
      break

    case 'network-error':
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network connection failed'))
      break

    case 'intermittent':
      let callCount = 0
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        callCount++
        if (callCount % 3 === 0) {
          // Every 3rd call fails with rate limit
          return Promise.reject(createRateLimitError({}))
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
          text: () => Promise.resolve(''),
        })
      })
      break

    default:
      throw new Error(`Unknown scenario: ${scenario}`)
  }

  return () => {
    global.fetch = originalFetch
  }
}

/**
 * Mock Octokit to simulate GitHub API rate limit responses
 */
export function mockOctokitWithRateLimit(octokit: any, scenario: 'success' | 'rate-limit' | 'auth-error') {
  switch (scenario) {
    case 'success':
      octokit.repos.getContent.mockResolvedValue({
        data: { content: Buffer.from('[]').toString('base64'), sha: 'abc123' },
      })
      octokit.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser' },
      })
      break

    case 'rate-limit':
      const error = createRateLimitError({})
      octokit.repos.getContent.mockRejectedValue(error)
      octokit.users.getAuthenticated.mockRejectedValue(error)
      break

    case 'auth-error':
      const authError = new Error('Bad credentials') as any
      authError.status = 401
      octokit.repos.getContent.mockRejectedValue(authError)
      octokit.users.getAuthenticated.mockRejectedValue(authError)
      break

    default:
      throw new Error(`Unknown scenario: ${scenario}`)
  }
}

/**
 * Simulate high-frequency requests to test rate limiting
 */
export async function simulateHighFrequencyRequests<T>(
  requestFn: () => Promise<T>,
  count: number = 100,
  concurrency: number = 10
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  const results: Array<{ success: boolean; result?: T; error?: Error }> = []

  // Split requests into batches to simulate concurrency
  const batches: Array<Array<() => Promise<T>>> = []
  for (let i = 0; i < count; i += concurrency) {
    const batch = Array.from({ length: Math.min(concurrency, count - i) }, () => requestFn)
    batches.push(batch)
  }

  // Execute batches sequentially, but requests within each batch concurrently
  for (const batch of batches) {
    const batchResults = await Promise.allSettled(batch.map(fn => fn()))
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push({ success: true, result: result.value })
      } else {
        results.push({ success: false, error: result.reason })
      }
    })

    // Small delay between batches to simulate real-world usage
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  return results
}

/**
 * Calculate rate limit statistics from simulation results
 */
export function calculateRateLimitStats(
  results: Array<{ success: boolean; error?: Error }>
): {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  rateLimitErrors: number
  otherErrors: number
  successRate: number
} {
  const totalRequests = results.length
  const successfulRequests = results.filter(r => r.success).length
  const failedRequests = results.filter(r => !r.success).length
  const rateLimitErrors = results.filter(
    r => !r.success && r.error?.message.includes('rate limit')
  ).length
  const otherErrors = failedRequests - rateLimitErrors

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    rateLimitErrors,
    otherErrors,
    successRate: (successfulRequests / totalRequests) * 100,
  }
}

/**
 * Test helper to verify rate limit avoidance
 */
export function expectNoRateLimitErrors(
  results: Array<{ success: boolean; error?: Error }>
): void {
  const rateLimitErrors = results.filter(
    r => !r.success && (
      r.error?.message.includes('rate limit') ||
      (r.error as any)?.status === 403
    )
  )

  if (rateLimitErrors.length > 0) {
    const errorMessages = rateLimitErrors.map(r => r.error?.message).join(', ')
    throw new Error(
      `Expected no rate limit errors, but found ${rateLimitErrors.length}: ${errorMessages}`
    )
  }
}