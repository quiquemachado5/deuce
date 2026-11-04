import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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

async function writeBundledFixture(root,{swapBrowserIds=false,omitWtaShard=false}={}) {
  const version='b'.repeat(20),atpMeta={id:'wins',total:1,smallTotal:0},wtaMeta={id:'wins',total:1,smallTotal:0}
  const partitions=[
    {id:'matches-atp-2020s',tour:'atp',fromYear:2020,toYear:2029,count:1},
    {id:'matches-wta-2020s',tour:'wta',fromYear:2020,toYear:2029,count:1},
  ]
  const dictionaries=Object.fromEntries(MATCH_BROWSER_DICTIONARIES.map(key=>[key,[]]))
  const browserRow=id=>Object.assign(Array(MATCH_BROWSER_ROW_LENGTH).fill(-1),{0:id,20:[],21:0,36:[],37:[]})
  const circuit={years:[2026],surfaces:[],categories:[],rounds:[],events:[],players:[],capabilities:{statistics:false,points:false,fiveSets:false}}
  const artifacts={
    manifest:{version,matchCount:2,competitionCount:0,editionCount:0,pieces:[atpMeta],circuitPieces:{atp:[atpMeta],wta:[wtaMeta]},matchPartitions:partitions,summary:{tours:{atp:1,wta:1}}},
    [partitions[0].id]:[{match_id:'atp-1',tour:'atp',year:2026}],
    ...(omitWtaShard?{}:{[partitions[1].id]:[{match_id:'wta-1',tour:'wta',year:2026}]}),
    players:[{name:'ATP',matchIds:['atp-1']},{name:'WTA',matchIds:['wta-1']}],competition:[],audit:[],eras:{},
    'piece-wins':{pages:{1:[{name:'ATP',proof:{match_id:'atp-1'}}]},smallPages:{}},
    'piece-wta-wins':{pages:{1:[{name:'WTA',proof:{match_id:'wta-1'}}]},smallPages:{}},
    'browser-index':{schema:MATCH_BROWSER_SCHEMA,count:2,partitions,circuits:{atp:circuit,wta:circuit}},
    'publication-index':{schema:1,count:2,entries:[
      {identity:'atp:atp-1',tour:'atp',year:2026,hash:'a'.repeat(24)},
      {identity:'wta:wta-1',tour:'wta',year:2026,hash:'b'.repeat(24)},
    ]},
    [`browser-${partitions[0].id}`]:{schema:MATCH_BROWSER_SCHEMA,...partitions[0],dictionaries,rows:[browserRow(swapBrowserIds?'wta-1':'atp-1')]},
    [`browser-${partitions[1].id}`]:{schema:MATCH_BROWSER_SCHEMA,...partitions[1],dictionaries,rows:[browserRow(swapBrowserIds?'atp-1':'wta-1')]},
  }
  await Promise.all(Object.entries(artifacts).map(([id,value])=>writeFile(join(root,`${id}.json.gz`),gzipSync(JSON.stringify(value)))))
}

test('bundled restore validates full shards without requiring the legacy monolith', async () => {
  const root=await mkdtemp(join(tmpdir(),'deuce-bundled-restore-'))
  try {
    await writeBundledFixture(root)
    const result=await verifyBundledDirectory(root)
    assert.equal(result.matches,2)
    await assert.rejects(readFile(join(root,'matches.json.gz')),error=>error?.code==='ENOENT')
  } finally { await rm(root,{recursive:true,force:true}) }
})

test('bundled restore rejects same-count browser shards with swapped full IDs', async () => {
  const root=await mkdtemp(join(tmpdir(),'deuce-bundled-mismatch-'))
  try {
    await writeBundledFixture(root,{swapBrowserIds:true})
    await assert.rejects(verifyBundledDirectory(root),/Browser\/full match IDs mismatch/)
  } finally { await rm(root,{recursive:true,force:true}) }
})

test('bundled restore rejects a missing declared full shard even without a monolith', async () => {
  const root=await mkdtemp(join(tmpdir(),'deuce-bundled-missing-'))
  try {
    await writeBundledFixture(root,{omitWtaShard:true})
    await assert.rejects(verifyBundledDirectory(root),/Missing bundled artifact: matches-wta-2020s\.json\.gz/)
  } finally { await rm(root,{recursive:true,force:true}) }
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
      'publication-index':blob({schema:1,count:2,entries:[
        {identity:'atp:atp-1',tour:'atp',year:2026,hash:'a'.repeat(24)},
        {identity:'wta:wta-1',tour:'wta',year:2026,hash:'b'.repeat(24)},
      ]}),
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
