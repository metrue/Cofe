import './globals.css'

import Head from 'next/head'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Toaster } from '@/components/ui/toaster'
import { getIconUrls } from '@/lib/githubApi'
import { gowun_wodum } from '@/components/ui/font'

export async function generateMetadata(): Promise<Metadata> {
  const title =
    'Cofe - Write and sync your blog posts & memos with one-click GitHub sign-in'
  const description =
    
    'Write and preserve your blogs, memos, and notes effortlessly. Sign in with GitHub to automatically sync your content to your own repository, ensuring your ideas are safely stored as long as GitHub exists.'

  const { iconPath } = await getIconPaths('')

  return {
    title,
    description,
    manifest: '/manifest.json',
    openGraph: {
      title,
      description,
      images: [{ url: iconPath, width: 512, height: 512, alt: 'App Logo' }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [iconPath],
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { iconPath } = await getIconPaths('')

  return (
    <html lang={'en'}>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <link rel='apple-touch-icon' href={iconPath} />
      </Head>
      <Script async src='https://www.googletagmanager.com/gtag/js?id=G-1MF16MH92D' />
      <Script id='google-analytics'>{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-5WTLPRB4YS');
      `}</Script>
      <body className={`${gowun_wodum.className} bg-[#f6f8fa]`}>
            <main className='pb-20 m-auto'>{children}</main>
            <Toaster />
      </body>
    </html>
  )
}

async function getIconPaths(accessToken: string | undefined) {
  const defaultIconPath = '/icon.jpg'
  const defaultAppleTouchIconPath = '/icon-144.jpg'

  if (accessToken) {
    const iconUrls = await getIconUrls(accessToken)
    return iconUrls
  }

  return {
    iconPath: defaultIconPath,
    appleTouchIconPath: defaultAppleTouchIconPath,
  }
}
