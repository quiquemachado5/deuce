import assert from 'node:assert/strict'
import {publicationSummaryHash} from '../lib/publication-hash.mjs'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import matchBrowserContract from '../lib/match-browser-contract.json' with { type: 'json' }

const PAGE_SIZE = 25
const PIECE_CHUNK_PAGES = 50
export const MATCH_BROWSER_SCHEMA = matchBrowserContract.schema
export const MATCH_BROWSER_ROW_LENGTH = matchBrowserContract.rowLength
export const MATCH_BROWSER_DICTIONARIES = matchBrowserContract.dictionaries
const sha256 = body => createHash('sha256').update(body).digest('hex')
const PRODUCT_ARTIFACTS=['edition-products','player-directory','search-products','elo-products','time-machine']
function validateProducts(products){for(const [id,value] of Object.entries(products))assert.equal(value?.schema,1,`Published product schema is incompatible: ${id}`)}

function validateManifest(manifest) {
  assert.match(manifest?.version || '', /^[a-f0-9]{20}$/, 'Dataset version is invalid')
  assert.ok(Number.isSafeInteger(manifest.matchCount) && manifest.matchCount > 0, 'Match count is invalid')
  assert.ok(Array.isArray(manifest.pieces), 'ATP piece catalogue is missing')
  assert.ok(Array.isArray(manifest.circuitPieces?.wta), 'WTA piece catalogue is missing')
  assert.ok(Array.isArray(manifest.matchPartitions) && manifest.matchPartitions.length > 0, 'Full match partitions are missing')
  assert.equal(new Set(manifest.matchPartitions.map(partition => partition.id)).size, manifest.matchPartitions.length, 'Full match partition identifiers are duplicated')
  assert.equal(manifest.matchPartitions.reduce((sum, partition) => sum + partition.count, 0), manifest.matchCount, 'Full match partition totals are incomplete')
  for (const partition of manifest.matchPartitions) {
    assert.match(partition.id || '', /^matches-(atp|wta)-\d{4}s$/, 'Full match partition identifier is invalid')
    assert.ok(partition.tour === 'atp' || partition.tour === 'wta', `Full match partition circuit is invalid: ${partition.id}`)
    assert.ok(Number.isSafeInteger(partition.fromYear) && Number.isSafeInteger(partition.toYear) && partition.fromYear <= partition.toYear, `Full match partition years are invalid: ${partition.id}`)
    assert.ok(Number.isSafeInteger(partition.count) && partition.count > 0, `Full match partition count is invalid: ${partition.id}`)
  }
  assert.equal((manifest.summary?.tours?.atp || 0) + (manifest.summary?.tours?.wta || 0), manifest.matchCount, 'Circuit totals do not match the manifest')
  return manifest
}

async function validateFullPartitions(manifest, readPartition) {
  const idsByPartition = new Map(), matches = []
  for (const partition of manifest.matchPartitions) {
    const rows = await readPartition(partition)
    assert.ok(Array.isArray(rows), `Full match partition is invalid: ${partition.id}`)
    assert.equal(rows.length, partition.count, `Full match partition count mismatch: ${partition.id}`)
    const ids = new Set()
    for (const match of rows) {
      assert.ok(typeof match?.match_id === 'string' && match.match_id.length > 0, `Full match partition ID is invalid: ${partition.id}`)
      assert.ok(!ids.has(match.match_id), `Full match partition contains duplicate IDs: ${partition.id}`)
      assert.equal(match.tour === 'wta' ? 'wta' : 'atp', partition.tour, `Full match partition circuit mismatch: ${partition.id}`)
      assert.ok(match.year >= partition.fromYear && match.year <= partition.toYear, `Full match partition year mismatch: ${partition.id}`)
      ids.add(match.match_id)
    }
    idsByPartition.set(partition.id, ids)
    matches.push(...rows)
  }
  return { matches, idsByPartition }
}

function pieceDefinitions(manifest) {
  return [
    ...manifest.pieces.map(meta => ({ meta, key: meta.id, bundled: `piece-${meta.id}` })),
    ...manifest.circuitPieces.wta.map(meta => ({ meta, key: `wta-${meta.id}`, bundled: `piece-wta-${meta.id}` })),
  ]
}

function validateMatches(manifest, matches) {
  assert.ok(Array.isArray(matches), 'Matches artifact is invalid')
  assert.equal(matches.length, manifest.matchCount, 'Match count differs from manifest')
  const ids = new Set(matches.map(match => match.match_id))
  assert.equal(ids.size, matches.length, 'Duplicate match identifiers found')
  const tours = matches.reduce((counts, match) => { counts[match.tour === 'wta' ? 'wta' : 'atp']++; return counts }, { atp: 0, wta: 0 })
  assert.deepEqual(tours, manifest.summary.tours, 'Circuit counts differ from manifest')
  return ids
}

function validatePublicationIndex(manifest,index,matches){
  assert.equal(index?.schema,1,'Publication index schema is incompatible')
  assert.equal(index.count,manifest.matchCount,'Publication index count differs from manifest')
  assert.ok(Array.isArray(index.entries)&&index.entries.length===manifest.matchCount,'Publication index entries are incomplete')
  const expected=new Map(matches.map(match=>[`${match.tour==='wta'?'wta':'atp'}:${match.match_id}`,match])),seen=new Set()
  for(const entry of index.entries){
    assert.ok(entry?.tour==='atp'||entry?.tour==='wta','Publication index circuit is invalid')
    assert.ok(typeof entry.identity==='string'&&entry.identity.startsWith(`${entry.tour}:`),'Publication index identity is invalid')
    assert.ok(expected.has(entry.identity),`Publication index references an unknown match: ${entry.identity}`)
    assert.ok(!seen.has(entry.identity),`Publication index contains a duplicate: ${entry.identity}`)
    assert.match(entry.hash||'',/^[a-f0-9]{24}$/,'Publication index hash is invalid')
    assert.ok(Number.isSafeInteger(entry.year),'Publication index year is invalid')
    const match=expected.get(entry.identity)
    assert.equal(entry.year,match.year,'Publication index year differs from the match')
    assert.equal(entry.hash,publicationSummaryHash(match),`Publication index content hash mismatch: ${entry.identity}`)
    seen.add(entry.identity)
  }
}

function validateRows(record, meta, validIds, label) {
  assert.ok(record && typeof record === 'object' && record.pages && record.smallPages, `${label} is invalid`)
  const rows = Object.values(record.pages).flat(), small = Object.values(record.smallPages).flat()
  assert.equal(rows.length, meta.total, `${label} main row count mismatch`)
  assert.equal(small.length, meta.smallTotal, `${label} small row count mismatch`)
  for (const row of [...rows, ...small]) if (row.proof) assert.ok(validIds.has(row.proof.match_id), `${label} references an unknown match`)
}

function validateSupportingArtifacts(manifest, players, competition, audit, eras, validIds) {
  assert.ok(Array.isArray(players) && players.length > 0, 'Players artifact is invalid')
  for (const player of players) {
    assert.ok(Array.isArray(player.matchIds), 'Player match identifiers are missing')
    assert.ok(player.matchIds.every(id => validIds.has(id)), 'Player references an unknown match')
  }
  assert.ok(Array.isArray(competition), 'Competition artifact is invalid')
  assert.equal(competition.length, manifest.competitionCount || 0, 'Competition count differs from manifest')
  assert.ok(Array.isArray(audit), 'Edition audit artifact is invalid')
  assert.equal(audit.length, manifest.editionCount || 0, 'Edition audit count differs from manifest')
  assert.ok(eras && typeof eras === 'object' && !Array.isArray(eras), 'Era artifact is invalid')
}

async function validateBrowser(manifest, index, readPartition, validIds, fullIdsByPartition) {
  assert.equal(index?.schema, MATCH_BROWSER_SCHEMA, 'Browser index schema is incompatible')
  assert.equal(index.count, manifest.matchCount, 'Browser index count differs from manifest')
  assert.ok(Array.isArray(index.partitions) && index.partitions.length > 0, 'Browser partitions are missing')
  assert.equal(new Set(index.partitions.map(partition => partition.id)).size, index.partitions.length, 'Browser partition identifiers are duplicated')
  assert.equal(index.partitions.reduce((sum, part) => sum + part.count, 0), manifest.matchCount, 'Browser partition totals are incomplete')
  const fullMeta = new Map(manifest.matchPartitions.map(partition => [partition.id, partition]))
  for (const tour of ['atp', 'wta']) {
    const circuit = index.circuits?.[tour]
    for (const field of ['years', 'surfaces', 'categories', 'rounds', 'events', 'players']) assert.ok(Array.isArray(circuit?.[field]), `Browser circuit field is missing: ${tour}.${field}`)
    for (const field of ['statistics', 'points', 'fiveSets']) assert.equal(typeof circuit?.capabilities?.[field], 'boolean', `Browser circuit capability is missing: ${tour}.${field}`)
  }
  const groups = await Promise.all(index.partitions.map(async meta => {
    const expected = fullMeta.get(meta.id)
    assert.ok(expected, `Browser partition has no full match partition: ${meta.id}`)
    for (const field of ['tour', 'fromYear', 'toYear', 'count']) assert.equal(meta[field], expected[field], `Browser/full metadata mismatch: ${meta.id}.${field}`)
    const partition = await readPartition(meta)
    assert.equal(partition?.schema, index.schema, `Browser schema mismatch: ${meta.id}`)
    for (const field of ['id', 'tour', 'fromYear', 'toYear', 'count']) assert.equal(partition[field], meta[field], `Browser metadata mismatch: ${meta.id}.${field}`)
    assert.ok(partition.dictionaries && MATCH_BROWSER_DICTIONARIES.every(key => Array.isArray(partition.dictionaries[key])), `Browser dictionaries missing: ${meta.id}`)
    assert.ok(Array.isArray(partition.rows), `Browser rows missing: ${meta.id}`)
    assert.equal(partition.rows.length, meta.count, `Browser row count mismatch: ${meta.id}`)
    const ids = partition.rows.map(row => row[0])
    for (const row of partition.rows) assert.ok(Array.isArray(row) && row.length === MATCH_BROWSER_ROW_LENGTH && validIds.has(row[0]), `Browser partition references an unknown match: ${meta.id}`)
    const fullIds = fullIdsByPartition.get(meta.id)
    assert.ok(fullIds, `Full match IDs are missing: ${meta.id}`)
    assert.equal(new Set(ids).size, ids.length, `Browser partition contains duplicate IDs: ${meta.id}`)
    assert.equal(ids.length, fullIds.size, `Browser/full match count mismatch: ${meta.id}`)
    assert.ok(ids.every(id => fullIds.has(id)), `Browser/full match IDs mismatch: ${meta.id}`)
    return ids
  }))
  const ids = groups.flat()
  assert.equal(new Set(ids).size, validIds.size, 'Browser match identifiers are duplicated or missing')
}

export async function verifyBundledDirectory(root) {
  const files = (await readdir(root)).filter(file => file.endsWith('.json.gz')).sort()
  const fileSet = new Set(files)
  const decode = async name => {
    const filename = `${name}.json.gz`
    assert.ok(fileSet.has(filename), `Missing bundled artifact: ${filename}`)
    return JSON.parse(gunzipSync(await readFile(join(root, filename))).toString())
  }
  const manifest = validateManifest(await decode('manifest'))
  const { matches, idsByPartition } = await validateFullPartitions(manifest, partition => decode(partition.id))
  const validIds = validateMatches(manifest, matches)
  const [players, competition, audit, eras, browserIndex,publicationIndex,...products] = await Promise.all(['players', 'competition', 'audit', 'eras', 'browser-index','publication-index',...PRODUCT_ARTIFACTS].map(decode))
  validateProducts(Object.fromEntries(PRODUCT_ARTIFACTS.map((id,index)=>[id,products[index]])))
  validateSupportingArtifacts(manifest, players, competition, audit, eras, validIds)
  validatePublicationIndex(manifest,publicationIndex,matches)
  const pieces = pieceDefinitions(manifest)
  for (const piece of pieces) validateRows(await decode(piece.bundled), piece.meta, validIds, piece.bundled)
  await validateBrowser(manifest, browserIndex, meta => decode(`browser-${meta.id}`), validIds, idsByPartition)
  return { files: files.length, matches: matches.length, statistics: pieces.length,
    browserPartitions: browserIndex.partitions.length, datasetVersion: manifest.version, tours: manifest.summary.tours,
    scope: 'Compressed bundled generation' }
}

const pageCount = total => Math.ceil(total / PAGE_SIZE)

export async function verifyFilesystemArchiveDirectory(root) {
  const manifest = validateManifest(JSON.parse(await readFile(join(root, 'reading-v2-manifest.json'), 'utf8')))
  assert.ok(manifest.artifactPacks && Object.keys(manifest.artifactPacks).length > 0, 'Artifact pack mapping is missing')
  const packs = new Map()
  for (const packId of new Set(Object.values(manifest.artifactPacks))) {
    assert.match(packId, /^pack-[a-f0-9]{64}$/, 'Pack identifier is invalid')
    const payload = JSON.parse(await readFile(join(root, `reading-v2-${manifest.version}-${packId}.json`), 'utf8'))
    assert.equal(sha256(JSON.stringify(payload)), packId.slice(5), `Pack checksum mismatch: ${packId}`)
    assert.ok(payload?.artifacts && typeof payload.artifacts === 'object', `Pack payload is invalid: ${packId}`)
    packs.set(packId, payload)
  }
  for (const [id, packId] of Object.entries(manifest.artifactPacks)) assert.notEqual(packs.get(packId)?.artifacts?.[id], undefined, `Missing mapped artifact payload: ${id}`)
  for (const [packId, pack] of packs) for (const id of Object.keys(pack.artifacts)) assert.equal(manifest.artifactPacks[id], packId, `Unmapped artifact in backup: ${id}`)
  const artifact = id => {
    const packId = manifest.artifactPacks[id]
    assert.ok(packId, `Missing artifact mapping: ${id}`)
    const value = packs.get(packId)?.artifacts?.[id]
    assert.notEqual(value, undefined, `Missing artifact payload: ${id}`)
    return value
  }
  const decodeBlob = id => {
    const index = artifact(id)
    let encoded
    if (typeof index?.gzip === 'string') encoded = index.gzip
    else {
      assert.equal(index?.encoding, 'gzip-chunks', `Blob index is invalid: ${id}`)
      assert.ok(Number.isSafeInteger(index?.chunks) && index.chunks > 0, `Blob chunks are invalid: ${id}`)
      encoded = Array.from({ length: index.chunks }, (_, part) => {
        const chunk = artifact(`${id}-chunk${part}`)?.chunk
        assert.ok(typeof chunk === 'string' && chunk.length > 0, `Blob chunk is invalid: ${id}-chunk${part}`)
        return chunk
      }).join('')
    }
    return JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString())
  }
  const { matches, idsByPartition } = await validateFullPartitions(manifest, partition => decodeBlob(partition.id))
  const validIds = validateMatches(manifest, matches)
  validatePublicationIndex(manifest,decodeBlob('publication-index'),matches)
  validateProducts(Object.fromEntries(PRODUCT_ARTIFACTS.map(id=>[id,decodeBlob(id)])))
  validateSupportingArtifacts(manifest, decodeBlob('players'), decodeBlob('competition'), decodeBlob('audit'), decodeBlob('eras'), validIds)
  const pieces = pieceDefinitions(manifest)
  for (const piece of pieces) {
    const pages = { pages: {}, smallPages: {} }
    for (const [group, total] of [['pages', piece.meta.total], ['smallPages', piece.meta.smallTotal]]) {
      const chunks = new Map()
      for (let page = 1; page <= pageCount(total); page++) {
        const chunkIndex = Math.floor((page - 1) / PIECE_CHUNK_PAGES)
        let chunk = chunks.get(chunkIndex)
        if (!chunk) {
          chunk = artifact(`piece-${piece.key}-chunk${chunkIndex}`)
          assert.equal(chunk?.encoding, 'gzip-base64', `Piece chunk is invalid: ${piece.key}-${chunkIndex}`)
          chunks.set(chunkIndex, chunk)
        }
        const encoded = chunk[group]?.[`p${page}`]
        assert.ok(typeof encoded === 'string', `Piece page is missing: ${piece.key}.${group}.${page}`)
        pages[group][String(page)] = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString())
      }
    }
    assert.equal(artifact(`piece-${piece.key}-chunk0`)?.encoding, 'gzip-base64', `Piece root chunk is missing: ${piece.key}`)
    validateRows(pages, piece.meta, validIds, `piece-${piece.key}`)
  }
  const browserIndex = decodeBlob('browser-index')
  await validateBrowser(manifest, browserIndex, meta => decodeBlob(`browser-${meta.id}`), validIds, idsByPartition)
  return { files: (await readdir(root)).length, matches: matches.length, statistics: pieces.length,
    browserPartitions: browserIndex.partitions.length, datasetVersion: manifest.version, tours: manifest.summary.tours,
    scope: 'Physical filesystem archive backup' }
}
