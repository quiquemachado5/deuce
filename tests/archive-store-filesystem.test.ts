import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  acquireArchiveLease,
  archiveStoreReport,
  deleteArchiveKeys,
  listArchiveKeys,
  readArchiveObject,
  writeArchiveObjects,
} from '../lib/archive-store'

test('filesystem archive writes atomically, reports usage and excludes concurrent writers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'deuce-archive-'))
  const previous = process.env.DEUCE_ARCHIVE_DIR
  process.env.DEUCE_ARCHIVE_DIR = root
  try {
    await writeArchiveObjects([{ key: 'sync-status', payload: { status: 'success' } }, { key: 'detail-modern-1', payload: { id: 1 } }])
    assert.deepEqual(await readArchiveObject('sync-status'), { status: 'success' })
    assert.deepEqual(await listArchiveKeys('detail-'), ['detail-modern-1'])
    const report = await archiveStoreReport()
    assert.equal(report?.objects, 2)
    assert.equal(report?.details, 1)
    assert.ok((report?.payloadBytes || 0) > 0)

    const release = await acquireArchiveLease('provider', 30)
    assert.equal(typeof release, 'function')
    assert.equal(await acquireArchiveLease('provider', 30), null)
    await release?.()
    const nextRelease = await acquireArchiveLease('provider', 30)
    assert.equal(typeof nextRelease, 'function')
    await nextRelease?.()

    await deleteArchiveKeys(['detail-modern-1'])
    assert.equal(await readArchiveObject('detail-modern-1'), undefined)
  } finally {
    if (previous === undefined) delete process.env.DEUCE_ARCHIVE_DIR
    else process.env.DEUCE_ARCHIVE_DIR = previous
    await rm(root, { recursive: true, force: true })
  }
})
