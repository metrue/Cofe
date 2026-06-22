import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Point the engine at an isolated temp cache dir before importing it, so the
// module's lazily-memoised cacheDir never touches the real data/translations.
const CACHE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'translate-test-'))
process.env.TRANSLATE_CACHE_DIR = CACHE_DIR

import { translateText } from '../../lib/translate'

function mockDeepSeek(content: string): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  })
}

describe('translateText', () => {
  const originalFetch = global.fetch
  const originalKey = process.env.DEEPSEEK_APIKEY
  const originalKeyAlt = process.env.DEEPSEEK_API_KEY

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  afterAll(() => {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true })
    restoreEnv('DEEPSEEK_APIKEY', originalKey)
    restoreEnv('DEEPSEEK_API_KEY', originalKeyAlt)
  })

  it('returns blank text immediately without calling the API', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await translateText('   ', 'en')

    expect(result.translatedText).toBe('   ')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls DeepSeek and caches the result on a cache miss', async () => {
    process.env.DEEPSEEK_APIKEY = 'test-key'
    const fetchMock = mockDeepSeek('Hello world')
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await translateText('你好世界-miss', 'en')

    expect(result.translatedText).toBe('Hello world')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serves a cached translation without calling the API again', async () => {
    process.env.DEEPSEEK_APIKEY = 'test-key'

    global.fetch = mockDeepSeek('Cached translation') as unknown as typeof fetch
    await translateText('你好世界-hit', 'en') // miss → writes cache

    const secondCall = jest.fn()
    global.fetch = secondCall as unknown as typeof fetch
    const result = await translateText('你好世界-hit', 'en') // hit → no fetch

    expect(result.translatedText).toBe('Cached translation')
    expect(secondCall).not.toHaveBeenCalled()
  })

  it('falls back to the original text when no API key is configured', async () => {
    delete process.env.DEEPSEEK_APIKEY
    delete process.env.DEEPSEEK_API_KEY
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await translateText('未翻译-nokey', 'en')

    expect(result.translatedText).toBe('未翻译-nokey')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}
