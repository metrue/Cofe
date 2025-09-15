// Jest setup file for external comments package tests

// Mock fetch globally for tests
global.fetch = jest.fn()

// Mock Next.js Image component if needed
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => props
}))

// Mock console methods for cleaner test output
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  // Reset fetch mock before each test
  ;(fetch as jest.MockedFunction<typeof fetch>).mockClear()
})

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks()
})

// Suppress console.error and console.warn in tests unless explicitly needed
console.error = jest.fn()
console.warn = jest.fn()

// Restore original console methods after all tests
afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})