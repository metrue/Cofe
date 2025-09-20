'use client'

import Script from 'next/script'
import { useEffect } from 'react'

interface AnalyticsProps {
  websiteId?: string
  scriptUrl?: string
  domains?: string[]
  enabled?: boolean
}

/**
 * Configurable Umami Analytics Component
 * 
 * Features:
 * - Fully configurable via environment variables
 * - Automatic page view tracking
 * - Custom event tracking support
 * - Privacy-focused (no cookies)
 * - Open source friendly (optional)
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_UMAMI_WEBSITE_ID: Your Umami website ID
 * - NEXT_PUBLIC_UMAMI_SCRIPT_URL: Your Umami script URL (default: official cloud)
 * - NEXT_PUBLIC_UMAMI_DOMAINS: Comma-separated list of domains to track
 * - NEXT_PUBLIC_ANALYTICS_ENABLED: Enable/disable analytics (default: false)
 */
export default function Analytics({
  websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || 'https://cloud.umami.is/script.js',
  domains = process.env.NEXT_PUBLIC_UMAMI_DOMAINS?.split(',') || [],
  enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'
}: AnalyticsProps = {}) {
  useEffect(() => {
    // Log configuration in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Configuration:', {
        enabled,
        websiteId: websiteId ? '***' + websiteId.slice(-4) : 'Not set',
        scriptUrl,
        domains,
        environment: process.env.NODE_ENV
      })
    }
  }, [enabled, websiteId, scriptUrl, domains])

  // Don't render if analytics is disabled or required config is missing
  if (!enabled || !websiteId) {
    return null
  }

  return (
    <>
      <Script
        src={scriptUrl}
        data-website-id={websiteId}
        data-domains={domains.length > 0 ? domains.join(',') : undefined}
        strategy="afterInteractive"
        onLoad={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('📊 Umami Analytics loaded successfully')
          }
        }}
        onError={(e) => {
          console.error('❌ Failed to load Umami Analytics:', e)
        }}
      />
    </>
  )
}

// Umami global interface
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, unknown>) => void
    }
  }
}

/**
 * Custom event tracking hook
 * Usage: const trackEvent = useUmamiTracking()
 *        trackEvent('button-click', { button: 'header-cta' })
 */
export function useUmamiTracking() {
  const trackEvent = (eventName: string, eventData?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track(eventName, eventData)
    } else if (process.env.NODE_ENV === 'development') {
      console.log('📊 Would track event:', eventName, eventData)
    }
  }

  return trackEvent
}

/**
 * Page view tracking hook for manual tracking
 * Usage: const trackPageView = useUmamiPageView()
 *        trackPageView('/custom-page', 'Custom Page Title')
 */
export function useUmamiPageView() {
  const trackPageView = (url?: string, title?: string) => {
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track('pageview', { url, title })
    } else if (process.env.NODE_ENV === 'development') {
      console.log('📊 Would track page view:', { url, title })
    }
  }

  return trackPageView
}