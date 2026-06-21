/**
 * Auto-translation utilities for blog.minghe.me
 *
 * Uses DeepSeek Chat API for translation, with file-based caching to minimise
 * API calls and avoid re-translating unchanged content.
 *
 * Environment variables:
 *   DEEPSEEK_APIKEY      – API key for DeepSeek Chat (required)
 *   TRANSLATE_CACHE_DIR  – custom cache dir (default: data/translations)
 *
 * NOTE: This module uses Node.js built-in modules (fs, path, crypto) and
 * can only be imported by server-side code (API routes, server components, etc.).
 * Client code should import from './translate.shared' instead.
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { normalizeLocale } from './translate.shared'

// Re-export shared helpers for convenience on the server side.
export { shouldTranslate, localeToLabel, getTranslatableLocales } from './translate.shared'

// ---------------------------------------------------------------------------
// DeepSeek API helpers
// ---------------------------------------------------------------------------

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

/** Map a locale code to the language name DeepSeek understands. */
function localeToLanguageName(locale: string): string {
  const names: Record<string, string> = {
    en: 'English',
    ja: 'Japanese',
    ko: 'Korean',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    pt: 'Portuguese',
    ru: 'Russian',
    ar: 'Arabic',
    hi: 'Hindi',
    it: 'Italian',
    nl: 'Dutch',
    tr: 'Turkish',
    pl: 'Polish',
    vi: 'Vietnamese',
    th: 'Thai',
    id: 'Indonesian',
  }
  // Normalise locale first
  const normalised = normalizeLocale(locale)
  return names[normalised] ?? 'English'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SHA-256 hex digest of a string – used as translation cache key. */
function hash(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex')
}

// ---------------------------------------------------------------------------
// Translation API
// ---------------------------------------------------------------------------

export interface TranslateResult {
  translatedText: string
  detectedSourceLanguage?: string
}

type TranslateFn = (text: string, targetLocale: string) => Promise<TranslateResult>

/**
 * Translate text via DeepSeek Chat API.
 * Falls back to identity (no-op) if no API key is configured.
 */
async function deepSeekTranslate(text: string, targetLocale: string): Promise<TranslateResult> {
  const apiKey = process.env.DEEPSEEK_APIKEY
  if (!apiKey) {
    console.warn('[translate] No DEEPSEEK_APIKEY set — falling back to identity.')
    return { translatedText: text }
  }

  const targetLanguage = localeToLanguageName(targetLocale)

  const systemPrompt = `You are a professional translator. Translate the following text from Chinese to ${targetLanguage}.

Rules:
1. Preserve ALL markdown formatting exactly as-is (headings, lists, tables, bold, italic, etc.)
2. Preserve ALL code blocks, inline code, URLs, and special characters verbatim
3. Preserve all LaTeX math expressions ($$...$$, $...$) exactly
4. Preserve all image markdown ![alt](url) unchanged
5. Only translate the natural language text — do not modify or translate code, URLs, or syntax
6. Keep the same line breaks and paragraph structure
7. Do not add any explanations, notes, or commentary — output ONLY the translated text`

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.1, // low temperature for more deterministic translation
      max_tokens: 8192,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DeepSeek API error (${res.status}): ${body}`)
  }

  const json = await res.json()
  const translatedText = json.choices?.[0]?.message?.content

  if (!translatedText) {
    throw new Error(`Unexpected DeepSeek API response: ${JSON.stringify(json)}`)
  }

  return {
    translatedText: translatedText.trim(),
    detectedSourceLanguage: 'zh', // we always translate from Chinese
  }
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let _cacheDir: string | null = null

function getCacheDir(): string {
  if (_cacheDir) return _cacheDir
  _cacheDir = process.env.TRANSLATE_CACHE_DIR ?? path.join(process.cwd(), 'data', 'translations')
  if (!fs.existsSync(_cacheDir)) {
    fs.mkdirSync(_cacheDir, { recursive: true })
  }
  return _cacheDir
}

function cachePath(contentHash: string, targetLocale: string): string {
  return path.join(getCacheDir(), `${contentHash}-${targetLocale}.json`)
}

function readCache(contentHash: string, targetLocale: string): string | null {
  try {
    const p = cachePath(contentHash, targetLocale)
    if (!fs.existsSync(p)) return null
    const raw = fs.readFileSync(p, 'utf-8')
    const entry = JSON.parse(raw)
    return entry.translatedText ?? null
  } catch {
    return null
  }
}

function writeCache(contentHash: string, targetLocale: string, translatedText: string): void {
  try {
    const p = cachePath(contentHash, targetLocale)
    fs.writeFileSync(p, JSON.stringify({ translatedText, cachedAt: new Date().toISOString() }), 'utf-8')
  } catch (err) {
    console.warn('[translate] Failed to write translation cache:', err)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _translateFn: TranslateFn = deepSeekTranslate

/**
 * Override the translation implementation (useful for testing or custom providers).
 */
export function setTranslateFn(fn: TranslateFn): void {
  _translateFn = fn
}

/**
 * Translate a block of text.
 *
 * Checks the file-based cache first. If a cache hit exists, returns instantly.
 * Otherwise calls the translation API, stores the result, and returns it.
 */
export async function translateText(text: string, targetLocale: string): Promise<TranslateResult> {
  if (!text.trim()) return { translatedText: text }

  // Normalise locale for cache key
  const normalised = normalizeLocale(targetLocale)

  // Check cache
  const contentHash = hash(text)
  const cached = readCache(contentHash, normalised)
  if (cached !== null) {
    return { translatedText: cached }
  }

  // Call translation API
  const result = await _translateFn(text, normalised)

  // Write cache (only if we got a real translation back)
  if (result.translatedText !== text) {
    writeCache(contentHash, normalised, result.translatedText)
  }

  return result
}

/**
 * Translate markdown content while preserving markdown syntax.
 *
 * For best quality with DeepSeek, we send the full markdown content in one
 * request and let the LLM handle syntax preservation via the system prompt.
 * Only fall back to line-by-line if the content exceeds token limits.
 */
export async function translateMarkdown(
  content: string,
  targetLocale: string,
): Promise<string> {
  if (!content.trim()) return content

  // For short content, translate as a whole (preserves context best)
  if (content.length < 8000) {
    const result = await translateText(content, targetLocale)
    return result.translatedText
  }

  // For longer content, break into paragraphs
  const blocks = content.split('\n\n')
  const translatedBlocks: string[] = []

  for (const block of blocks) {
    const result = await translateText(block, targetLocale)
    translatedBlocks.push(result.translatedText)
  }

  return translatedBlocks.join('\n\n')
}
