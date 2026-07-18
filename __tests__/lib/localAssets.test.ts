/**
 * @jest-environment node
 */
import { promises as fsp } from 'fs'
import os from 'os'
import path from 'path'

class FakeFile {
  constructor(public name: string, public type: string, private data: Buffer) {}
  async arrayBuffer() {
    return this.data.buffer.slice(this.data.byteOffset, this.data.byteOffset + this.data.byteLength)
  }
}

describe('localAssets (local mode image storage)', () => {
  let tmpDir: string
  const prev = process.env.COFE_DIR

  async function fresh() {
    jest.resetModules()
    return import('@/lib/localAssets')
  }

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cofe-assets-'))
    process.env.COFE_DIR = tmpDir
  })
  afterEach(async () => {
    if (prev === undefined) delete process.env.COFE_DIR
    else process.env.COFE_DIR = prev
    await fsp.rm(tmpDir, { recursive: true, force: true })
  })

  it('saves under assets/images/<date>/ and reads back with content-type', async () => {
    const { saveLocalAsset, readLocalAsset } = await fresh()
    const file = new FakeFile('pic.png', 'image/png', Buffer.from([1, 2, 3, 4]))
    const url = await saveLocalAsset(file as unknown as File, { date: '2026-07-18', id: '123' })
    expect(url).toBe('/api/asset/images/2026-07-18/123.png')

    const read = readLocalAsset(['images', '2026-07-18', '123.png'])
    expect(read).not.toBeNull()
    expect(read!.contentType).toBe('image/png')
    expect(Array.from(read!.body)).toEqual([1, 2, 3, 4])
  })

  it('rejects path traversal', async () => {
    const { readLocalAsset } = await fresh()
    expect(readLocalAsset(['..', 'secret'])).toBeNull()
    expect(readLocalAsset(['images', '..', '..', 'etc'])).toBeNull()
  })

  it('returns null for missing files', async () => {
    const { readLocalAsset } = await fresh()
    expect(readLocalAsset(['images', 'nope.png'])).toBeNull()
  })
})
