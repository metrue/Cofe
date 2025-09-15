import { NextRequest, NextResponse } from 'next/server'
import { fetchCommentsForPlatform, type ExternalDiscussion } from '@/lib/external-comments'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') as ExternalDiscussion['platform']
    const url = searchParams.get('url')

    if (!platform || !url) {
      return NextResponse.json(
        { error: 'Platform and URL parameters are required' },
        { status: 400 }
      )
    }

    if (!['v2ex', 'reddit', 'hackernews'].includes(platform)) {
      return NextResponse.json(
        { error: `Unsupported platform: ${platform}` },
        { status: 400 }
      )
    }

    const comments = await fetchCommentsForPlatform({ platform, url })

    return NextResponse.json({ comments }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400', // Cache for 5 minutes, serve stale up to 1 day
      },
    })
  } catch (error) {
    console.error('Error in external-comments API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}