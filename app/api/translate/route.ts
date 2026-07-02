import { translateMarkdown, translateText, shouldTranslate } from '@/lib/translate'
import { NextRequest, NextResponse } from 'next/server'

// Translating a full blog post is a single DeepSeek call that routinely runs
// well past Vercel's ~10s default, returning 504 for anything but short text
// (e.g. titles). Give the request room to finish. 60s is the Hobby ceiling;
// Pro allows up to 300.
export const maxDuration = 60
export const runtime = 'nodejs'

export interface TranslateRequestBody {
  text: string
  targetLocale: string
  /** If true, content is treated as markdown and markdown syntax is preserved. */
  isMarkdown?: boolean
}

export interface TranslateResponseBody {
  translatedText: string
  error?: string
}

/**
 * POST /api/translate
 *
 * Translates the provided text into the target locale.
 * Content in Chinese (zh) will be translated; Chinese locales return the original.
 *
 * Body:
 *   { text: string, targetLocale: string, isMarkdown?: boolean }
 */
export async function POST(request: NextRequest): Promise<NextResponse<TranslateResponseBody>> {
  try {
    const body: TranslateRequestBody = await request.json()

    if (!body.text || !body.targetLocale) {
      return NextResponse.json(
        { translatedText: '', error: 'Missing required fields: text, targetLocale' },
        { status: 400 },
      )
    }

    // Sanity: limit input length to avoid abuse / excessive API cost
    if (body.text.length > 50_000) {
      return NextResponse.json(
        { translatedText: '', error: 'Text too long (max 50,000 characters)' },
        { status: 413 },
      )
    }

    // Validate locale
    const supportedLocales = [
      'en', 'zh', 'zh-TW', 'zh-HK', 'ja', 'ko', 'fr', 'de', 'es',
      'pt', 'ru', 'ar', 'hi', 'it', 'nl', 'tr', 'pl', 'vi', 'th', 'id',
    ]
    if (!supportedLocales.includes(body.targetLocale)) {
      return NextResponse.json(
        { translatedText: '', error: `Unsupported locale: ${body.targetLocale}` },
        { status: 400 },
      )
    }

    // No-op for Chinese locales (blog content is primarily Chinese)
    if (!shouldTranslate(body.targetLocale)) {
      return NextResponse.json({ translatedText: body.text })
    }

    const translatedText = body.isMarkdown
      ? await translateMarkdown(body.text, body.targetLocale)
      : (await translateText(body.text, body.targetLocale)).translatedText

    return NextResponse.json({ translatedText })
  } catch (error) {
    console.error('[translate API] Error:', error)
    return NextResponse.json(
      {
        translatedText: '',
        error: error instanceof Error ? error.message : 'Internal translation error',
      },
      { status: 500 },
    )
  }
}
