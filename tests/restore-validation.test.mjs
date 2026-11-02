import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { MATCH_BROWSER_DICTIONARIES, MATCH_BROWSER_ROW_LENGTH, MATCH_BROWSER_SCHEMA, verifyBundledDirectory, verifyFilesystemArchiveDirectory } from '../build/restore-validation.mjs'

const blob = value => ({ gzip: gzipSync(JSON.stringify(value)).toString('base64') })
const page = value => gzipSync(JSON.stringify(value)).toString('base64')
const chunked = (id, value) => {
  const encoded = page(value), cut = Math.ceil(encoded.length / 2)
  return { [id]: { encoding: 'gzip-chunks', chunks: 2 },
    [`${id}-chunk0`]: { chunk: encoded.slice(0, cut) }, [`${id}-chunk1`]: { chunk: encoded.slice(cut) } }
}

test('bundled restore validation covers WTA pieces and every browser partition', async () => {
  const result = await verifyBundledDirectory(join(process.cwd(), 'data', 'reading'))
  assert.ok(result.statistics > 0)
  assert.ok(result.browserPartitions > 0)
  assert.ok(result.tours.atp > 0 && result.tours.wta > 0)
})

test('physical restore validation reconstructs complete packed artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'deuce-packed-restore-'))
  try {
    const version = 'a'.repeat(20)
    const atpMeta = { id: 'wins', total: 1, smallTotal: 0 }
    const wtaMeta = { id: 'wins', total: 2, smallTotal: 0 }
    const partitions = [
      { id: 'matches-atp-2020s', tour: 'atp', fromYear: 2020, toYear: 2029, count: 1 },
      { id: 'matches-wta-2020s', tour: 'wta', fromYear: 2020, toYear: 2029, count: 1 },
    ]
    const dictionaries = Object.fromEntries(MATCH_BROWSER_DICTIONARIES.map(key => [key, []]))
    const browserRow = id => Object.assign(Array(MATCH_BROWSER_ROW_LENGTH).fill(-1), { 0: id, 20: [], 21: 0, 36: [], 37: [] })
    const circuit = { years: [2026], surfaces: [], categories: [], rounds: [], events: [], players: [], capabilities: { statistics: false, points: false, fiveSets: false } }
    const artifacts = {
      [partitions[0].id]: blob([{ match_id: 'atp-1', tour: 'atp', year: 2026 }]),
      [partitions[1].id]: blob([{ match_id: 'wta-1', tour: 'wta', year: 2026 }]),
      ...chunked('players', [{ name: 'ATP', matchIds: ['atp-1'] }, { name: 'WTA', matchIds: ['wta-1'] }]),
      competition: blob([]), audit: blob([]), eras: blob({}),
      'piece-wins-chunk0': { encoding: 'gzip-base64', pages: { p1: page([{ name: 'ATP', proof: { match_id: 'atp-1' } }]) }, smallPages: {} },
      'piece-wta-wins-chunk0': { encoding: 'gzip-base64', pages: { p1: page([
        { name: 'WTA 1', proof: { match_id: 'wta-1' } }, { name: 'WTA 2', proof: { match_id: 'wta-1' } },
      ]) }, smallPages: {} },
      'browser-index': blob({ schema: MATCH_BROWSER_SCHEMA, count: 2, partitions, circuits: { atp: circuit, wta: circuit } }),
      [`browser-${partitions[0].id}`]: blob({ schema: MATCH_BROWSER_SCHEMA, ...partitions[0], dictionaries, rows: [browserRow('atp-1')] }),
      [`browser-${partitions[1].id}`]: blob({ schema: MATCH_BROWSER_SCHEMA, ...partitions[1], dictionaries, rows: [browserRow('wta-1')] }),
    }
    const payload = { artifacts }
    const packId = `pack-${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`
    const manifest = { version, matchCount: 2, competitionCount: 0, editionCount: 0, pieces: [atpMeta],
      circuitPieces: { atp: [atpMeta], wta: [wtaMeta] }, matchPartitions: partitions,
      summary: { tours: { atp: 1, wta: 1 } }, artifactPacks: Object.fromEntries(Object.keys(artifacts).map(id => [id, packId])) }
    await writeFile(join(root, 'reading-v2-manifest.json'), JSON.stringify(manifest))
    await writeFile(join(root, `reading-v2-${version}-${packId}.json`), JSON.stringify(payload))
    const result = await verifyFilesystemArchiveDirectory(root)
    assert.equal(result.matches, 2)
    assert.equal(result.statistics, 2)
    assert.equal(result.browserPartitions, 2)
  } finally { await rm(root, { recursive: true, force: true }) }
})
