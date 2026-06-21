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

export { shouldTranslate, localeToLabel, getTranslatableLocales } from './translate.shared'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

export interface TranslateResult {
  translatedText: string
  detectedSourceLanguage?: string
}

function hash(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex')
}

function localeToLanguageName(locale: string): string {
  const names: Record<string, string> = {
    en: 'English', ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German',
    es: 'Spanish', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic', hi: 'Hindi',
    it: 'Italian', nl: 'Dutch', tr: 'Turkish', pl: 'Polish', vi: 'Vietnamese',
    th: 'Thai', id: 'Indonesian',
  }
  return names[normalizeLocale(locale)] ?? 'English'
}

function buildTranslationPrompt(targetLanguage: string): string {
  return `You are a professional translator. Translate the following text from Chinese to ${targetLanguage}.

Rules:
1. Preserve ALL markdown formatting exactly as-is (headings, lists, tables, bold, italic, etc.)
2. Preserve ALL code blocks, inline code, URLs, and special characters verbatim
3. Preserve all LaTeX math expressions ($$...$$, $...$) exactly
4. Preserve all image markdown ![alt](url) unchanged
5. Only translate the natural language text — do not modify or translate code, URLs, or syntax
6. Keep the same line breaks and paragraph structure
7. Do not add any explanations, notes, or commentary — output ONLY the translated text`
}

function deepSeekApiKey(): string | undefined {
  return process.env.DEEPSEEK_APIKEY ?? process.env.DEEPSEEK_API_KEY
}

async function callDeepSeek(text: string, targetLanguage: string): Promise<TranslateResult> {
  const apiKey = deepSeekApiKey()
  if (!apiKey) {
    console.warn('[translate] No DEEPSEEK_APIKEY / DEEPSEEK_API_KEY set — falling back to identity.')
    return { translatedText: text }
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: buildTranslationPrompt(targetLanguage) },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
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
    detectedSourceLanguage: 'zh',
  }
}

let cacheDir: string | null = null

function ensureCacheDir(): string {
  if (cacheDir) return cacheDir
  cacheDir = process.env.TRANSLATE_CACHE_DIR ?? path.join(process.cwd(), 'data', 'translations')
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  return cacheDir
}

function cachePath(contentHash: string, targetLocale: string): string {
  return path.join(ensureCacheDir(), `${contentHash}-${targetLocale}.json`)
}

function readCache(contentHash: string, targetLocale: string): string | null {
  try {
    const p = cachePath(contentHash, targetLocale)
    if (!fs.existsSync(p)) return null
    const entry = JSON.parse(fs.readFileSync(p, 'utf-8'))
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

/**
 * Translate a block of text.
 *
 * Checks the file-based cache first. If a cache hit exists, returns instantly.
 * Otherwise calls the translation API, stores the result, and returns it.
 */
export async function translateText(text: string, targetLocale: string): Promise<TranslateResult> {
  if (!text.trim()) return { translatedText: text }

  const normalised = normalizeLocale(targetLocale)
  const contentHash = hash(text)
  const cached = readCache(contentHash, normalised)

  if (cached !== null) {
    return { translatedText: cached }
  }

  const result = await callDeepSeek(text, localeToLanguageName(targetLocale))

  if (result.translatedText !== text) {
    writeCache(contentHash, normalised, result.translatedText)
  }

  return result
}

const MAX_SINGLE_REQUEST_CHARS = 8_000

/**
 * Translate markdown content while preserving markdown syntax.
 *
 * Sends the full content in one request when short (better context for the LLM).
 * Falls back to paragraph-by-paragraph for longer content.
 */
export async function translateMarkdown(
  content: string,
  targetLocale: string,
): Promise<string> {
  if (!content.trim()) return content

  if (content.length < MAX_SINGLE_REQUEST_CHARS) {
    const result = await translateText(content, targetLocale)
    return result.translatedText
  }

  const blocks = content.split('\n\n')
  const translatedBlocks: string[] = []

  for (const block of blocks) {
    const result = await translateText(block, targetLocale)
    translatedBlocks.push(result.translatedText)
  }

  return translatedBlocks.join('\n\n')
}
