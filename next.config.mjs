import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */

const nextConfig = {
  // Standalone output powers the `npx cici` CLI: a self-contained server that
  // can serve any `--data <dir>` at runtime. Vercel handles this output natively.
  output: 'standalone',
  // Route the ISR/fetch cache to os.tmpdir() — the standalone server runs from a
  // read-only FS on Vercel (/var/task), so the default .next/cache mkdir fails.
  cacheHandler: new URL('./cache-handler.cjs', import.meta.url).pathname,
  cacheMaxMemorySize: 0,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
      {
        protocol: 'http',
        hostname: '*',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/manifest.json',
        destination: '/manifest.json',
      },
    ]
  },
}

export default withNextIntl(nextConfig)
