import './globals.css'

import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import CreateButton from '@/components/CreateButton'
import Head from 'next/head'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import Script from 'next/script'
import { SessionProvider } from '../components/SessionProvider'
import { Toaster } from '@/components/ui/toaster'
import { authOptions } from '@/lib/auth'
import { getIconUrls } from '@/lib/githubApi'
import { getServerSession } from 'next-auth/next'
import { gowun_wodum } from '@/components/ui/font'
import { getSiteConfig } from '@/lib/siteConfig'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  const session = await getServerSession(authOptions)
  const siteConfig = getSiteConfig()

  const title = t('title') || siteConfig.title
  const description = t('description') || siteConfig.description

  const { iconPath } = await getIconPaths(session?.accessToken)

  return {
    title,
    description,
    keywords: siteConfig.keywords,
    authors: [{ name: siteConfig.author.name }],
    creator: siteConfig.author.name,
    publisher: siteConfig.author.name,
    manifest: '/manifest.json',
    openGraph: {
      title,
      description,
      images: [{ url: iconPath, width: 512, height: 512, alt: 'App Logo' }],
      type: 'website',
      siteName: siteConfig.title,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [iconPath],
      creator: `@${siteConfig.social.twitter}`,
      site: `@${siteConfig.social.twitter}`,
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  const session = await getServerSession(authOptions)

  const { iconPath } = await getIconPaths(session?.accessToken)

  return (
    <html lang={locale}>
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
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <main className='pb-20 m-auto'>{children}</main>
            <CreateButton messages={messages} />
            <Toaster />
          </SessionProvider>
        </NextIntlClientProvider>
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
