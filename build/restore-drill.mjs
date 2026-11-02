import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { access, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { gunzipSync } from 'node:zlib'
import assert from 'node:assert/strict'

const location = await mkdtemp(join(tmpdir(), 'deuce-restore-drill-'))
const archive = join(location, 'backup.tar.gz')
const restored = join(location, 'restored')
const sourceArchive = process.env.DEUCE_RESTORE_ARCHIVE ? resolve(process.env.DEUCE_RESTORE_ARCHIVE) : undefined
const sha256 = body => createHash('sha256').update(body).digest('hex')
const run = (command, args) => new Promise((resolvePromise, reject) => {
  const child = spawn(command, args, { stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolvePromise() : reject(new Error(`${command} exited ${code}`)))
})

if (sourceArchive) {
  await access(sourceArchive)
  await run('cp', [sourceArchive, archive])
  try {
    const expected = (await readFile(`${sourceArchive}.sha256`, 'utf8')).trim().split(/\s+/)[0]
    assert.equal(sha256(await readFile(sourceArchive)), expected, 'External backup checksum mismatch')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
} else {
  const cached = join(process.cwd(), '.deuce-cache', 'reading')
  const bundled = await access(join(cached, 'manifest.json.gz')).then(() => cached).catch(() => join(process.cwd(), 'data', 'reading'))
  await run('tar', ['-czf', archive, '-C', bundled, '.'])
}
const archiveHash = sha256(await readFile(archive))
await writeFile(join(location, 'backup.tar.gz.sha256'), `${archiveHash}  backup.tar.gz\n`, { flag: 'wx' })
await run('mkdir', ['-p', restored])
await run('tar', ['-xzf', archive, '-C', restored])

async function verifyBundled() {
  const files = (await readdir(restored)).filter(file => file.endsWith('.json.gz')).sort()
  const hashes = {}
  for (const file of files) hashes[file] = sha256(await readFile(join(restored, file)))
  const decode = async name => JSON.parse(gunzipSync(await readFile(join(restored, `${name}.json.gz`))).toString())
  const manifest = await decode('manifest'), matches = await decode('matches'), players = await decode('players')
  assert.equal(matches.length, manifest.matchCount)
  assert.equal(new Set(matches.map(match => match.match_id)).size, matches.length)
  assert.ok(players.length > 0)
  const validIds = new Set(matches.map(match => match.match_id))
  for (const player of players) assert.ok(player.matchIds.every(id => validIds.has(id)))
  for (const piece of manifest.pieces) {
    const record = await decode(`piece-${piece.id}`)
    const rows = Object.values(record.pages).flat(), small = Object.values(record.smallPages).flat()
    assert.equal(rows.length, piece.total); assert.equal(small.length, piece.smallTotal)
    for (const row of [...rows, ...small]) if (row.proof) assert.ok(validIds.has(row.proof.match_id))
  }
  return { files: files.length, matches: matches.length, statistics: manifest.pieces.length, datasetVersion: manifest.version, tours: manifest.summary?.tours, scope: 'Compressed bundled generation' }
}

async function verifyFilesystemArchive() {
  const manifest = JSON.parse(await readFile(join(restored, 'reading-v2-manifest.json'), 'utf8'))
  assert.match(manifest.version, /^[a-f0-9]{20}$/)
  assert.ok(manifest.artifactPacks && Object.keys(manifest.artifactPacks).length > 0)
  const packs = new Map()
  for (const packId of new Set(Object.values(manifest.artifactPacks))) {
    assert.match(packId, /^pack-[a-f0-9]{64}$/)
    const payload = JSON.parse(await readFile(join(restored, `reading-v2-${manifest.version}-${packId}.json`), 'utf8'))
    assert.equal(sha256(JSON.stringify(payload)), packId.slice(5), `Pack checksum mismatch: ${packId}`)
    packs.set(packId, payload)
  }
  const artifact = id => {
    const packId = manifest.artifactPacks[id]
    assert.ok(packId, `Missing artifact mapping: ${id}`)
    const value = packs.get(packId)?.artifacts?.[id]
    assert.notEqual(value, undefined, `Missing artifact payload: ${id}`)
    return value
  }
  const decodeBlob = id => {
    const index = artifact(id)
    const encoded = typeof index.gzip === 'string' ? index.gzip : Array.from({ length: index.chunks }, (_, part) => artifact(`${id}-chunk${part}`).chunk).join('')
    return JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString())
  }
  const count = manifest.matchPartitions?.reduce((sum, partition) => {
    const rows = decodeBlob(partition.id)
    assert.equal(rows.length, partition.count, `Partition count mismatch: ${partition.id}`)
    return sum + rows.length
  }, 0) || decodeBlob('matches').length
  assert.equal(count, manifest.matchCount)
  return { files: (await readdir(restored)).length, matches: count, statistics: manifest.pieces.length, datasetVersion: manifest.version, tours: manifest.summary?.tours, scope: 'Physical filesystem archive backup' }
}

let result
try { await access(join(restored, 'reading-v2-manifest.json')); result = await verifyFilesystemArchive() }
catch (error) { if (error?.code !== 'ENOENT') throw error; result = await verifyBundled() }
console.log(JSON.stringify({ status: 'verified', archiveSha256: archiveHash, location, ...result }, null, 2))
