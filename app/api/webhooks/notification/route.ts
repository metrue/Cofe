/**
 * Apple App Store Server Notifications V2 Webhook
 *
 * Receives subscription events from Apple and sends notifications via Day.app
 * Supports multiple products (Mile, ExpenSee, Wnder)
 *
 * Webhook URL: https://blog.minghe.me/api/webhooks/notification
 * Configure this URL in App Store Connect for each app.
 */

import { NextRequest, NextResponse } from 'next/server'

// Product configuration - maps product IDs to friendly names and emojis
const PRODUCTS: Record<string, { name: string; emoji: string }> = {
  'app.milemile.monthly': { name: 'Mile Premium', emoji: '✈️' },
  'app.expensee.premium': { name: 'ExpenSee Premium', emoji: '💰' },
  'app.wnder.premium': { name: 'Wnder Premium', emoji: '🎧' },
}

// Event types we want to track
const TRACKED_EVENTS = new Set([
  'SUBSCRIBED', // New subscription
  'DID_RENEW', // Subscription renewed
  'DID_FAIL_TO_RENEW', // Payment failed
  'EXPIRED', // Subscription expired
  'REFUND', // Refunded
  'DID_CHANGE_RENEWAL_STATUS', // Auto-renewal toggled
])

/**
 * Decode base64url JWT payload (without verification for simplicity)
 * Note: In production, you should verify the signature with Apple's certificates
 */
function decodeJWTPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  // Decode base64url
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')

  const decoded = Buffer.from(payload, 'base64').toString('utf-8')
  return JSON.parse(decoded)
}

/**
 * Format notification title based on event type
 */
function formatTitle(
  notificationType: string,
  productInfo: { name: string; emoji: string }
): string {
  const { name, emoji } = productInfo

  switch (notificationType) {
    case 'SUBSCRIBED':
      return `${emoji} ${name} - New Subscription`
    case 'DID_RENEW':
      return `${emoji} ${name} - Renewed`
    case 'DID_FAIL_TO_RENEW':
      return `⚠️ ${name} - Payment Failed`
    case 'EXPIRED':
      return `⏰ ${name} - Expired`
    case 'REFUND':
      return `💸 ${name} - Refunded`
    case 'DID_CHANGE_RENEWAL_STATUS':
      return `⚙️ ${name} - Status Changed`
    default:
      return `📱 ${name} - ${notificationType}`
  }
}

/**
 * Format notification body with subscription details
 */
function formatBody(
  transaction: Record<string, unknown>,
  notification: Record<string, unknown>
): string {
  const lines: string[] = []

  // Product ID
  if (transaction.productId) {
    lines.push(`Product: ${transaction.productId}`)
  }

  // Purchase date
  if (transaction.purchaseDate) {
    const date = new Date(Number(transaction.purchaseDate))
    lines.push(`Date: ${date.toUTCString()}`)
  }

  // Expiry date
  if (transaction.expiresDate) {
    const date = new Date(Number(transaction.expiresDate))
    lines.push(`Expires: ${date.toUTCString()}`)
  }

  // Transaction ID (for debugging)
  if (transaction.originalTransactionId) {
    lines.push(`TX: ${transaction.originalTransactionId}`)
  }

  // Environment (sandbox/production)
  const env = notification.environment || notification.notificationEnvironment
  if (env) {
    const envLabel = env === 'Sandbox' ? '🧪 Sandbox' : '🟢 Production'
    lines.push(`Env: ${envLabel}`)
  }

  return lines.join('\n')
}

/**
 * Send notification to Day.app
 */
async function sendDayAppNotification(
  title: string,
  body: string
): Promise<boolean> {
  const token = process.env.DAY_APP_TOKEN
  if (!token) {
    console.error('DAY_APP_TOKEN environment variable not set')
    return false
  }

  try {
    const url = `https://api.day.app/${token}/${encodeURIComponent(title)}/${encodeURIComponent(body)}`

    console.log('Sending notification to Day.app:', { title, body })

    const response = await fetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      console.error('Day.app error:', await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send Day.app notification:', error)
    return false
  }
}

/**
 * Main POST handler for Apple webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log('Received Apple notification:', JSON.stringify(payload, null, 2))

    // Extract signed payload
    const { signedPayload } = payload
    if (!signedPayload) {
      console.error('Missing signedPayload')
      return NextResponse.json(
        { error: 'Missing signedPayload' },
        { status: 400 }
      )
    }

    // Decode notification
    const notification = decodeJWTPayload(signedPayload)
    const { notificationType, data } = notification as {
      notificationType: string
      data?: { signedTransactionInfo?: string }
    }

    console.log('Notification type:', notificationType)

    // Filter events we care about
    if (!TRACKED_EVENTS.has(notificationType)) {
      console.log(`Ignoring event type: ${notificationType}`)
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 })
    }

    // Decode transaction info
    if (!data?.signedTransactionInfo) {
      console.error('Missing signedTransactionInfo')
      return NextResponse.json(
        { error: 'Missing transaction info' },
        { status: 400 }
      )
    }

    const transaction = decodeJWTPayload(data.signedTransactionInfo)
    const productId = transaction.productId as string | undefined

    console.log('Product ID:', productId)

    // Get product info
    const productInfo = productId
      ? PRODUCTS[productId] || {
          name: productId,
          emoji: '📱',
        }
      : { name: 'Unknown Product', emoji: '📱' }

    // Format notification
    const title = formatTitle(notificationType, productInfo)
    const body = formatBody(transaction, notification)

    // Send to Day.app
    const success = await sendDayAppNotification(title, body)

    if (success) {
      console.log('Notification sent successfully')
    } else {
      console.error('Failed to send notification')
    }

    // Always return 200 to Apple to acknowledge receipt
    return NextResponse.json({ message: 'OK' }, { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)

    // Still return 200 to prevent Apple from retrying indefinitely
    return NextResponse.json({ message: 'OK' }, { status: 200 })
  }
}

/**
 * GET handler for health checks
 */
export async function GET() {
  return NextResponse.json({
    message: 'App Store webhook endpoint',
    status: 'active',
    trackedEvents: Array.from(TRACKED_EVENTS),
    products: Object.keys(PRODUCTS),
  })
}
