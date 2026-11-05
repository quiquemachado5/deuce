import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { access, copyFile, link, mkdtemp, mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

const root = process.cwd()
const workingReading = join(root, 'data', 'reading')
const cachedReading = join(root, '.deuce-cache', 'reading')
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const hash = value => createHash('sha256').update(value).digest('hex')
const safeName = value => typeof value === 'string' && /^[a-zA-Z0-9._-]+\.json\.gz$/.test(value)

async function filesAt(path) {
  return (await readdir(path)).filter(name => name.endsWith('.json.gz')).sort()
}

async function sameFile(path, expected) {
  try {
    const metadata = await stat(path)
    if (metadata.size !== expected.bytes) return false
    return hash(await readFile(path)) === expected.sha256
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function cloneFile(source, destination) {
  try { await link(source, destination) }
  catch (error) {
    if (!['EXDEV', 'EPERM', 'EOPNOTSUPP'].includes(error?.code)) throw error
    await copyFile(source, destination)
  }
}

async function syncDirectory(path) {
  let handle
  try { handle = await open(path, 'r'); await handle.sync() }
  catch (error) { if (!['EINVAL', 'ENOTSUP', 'EISDIR'].includes(error?.code)) throw error }
  finally { await handle?.close() }
}

/**
 * Failure-atomic handoff for offline build/restore jobs. The live archive uses
 * an immutable generation plus a pointer written last; this directory helper
 * must not be used while another process is opening files below `target`.
 */
async function promoteDirectory(staged, target, retainRollback) {
  const rollback = `${target}.rollback`
  await rm(rollback, { recursive: true, force: true })
  const hadPrevious = await rename(target, rollback).then(() => true).catch(error => {
    if (error?.code === 'ENOENT') return false
    throw error
  })
  try { await rename(staged, target) }
  catch (error) {
    if (hadPrevious) await rename(rollback, target)
    throw error
  }
  try { await syncDirectory(dirname(target)) }
  catch (error) {
    if (hadPrevious) {
      const failed = `${target}.failed-${process.pid}`
      await rename(target, failed)
      await rename(rollback, target)
      await rm(failed, { recursive: true, force: true })
    }
    throw error
  }
  if (!retainRollback) await rm(rollback, { recursive: true, force: true })
  return hadPrevious ? rollback : undefined
}

function cohortFor(name) {
  const partition = /^(?:browser-)?matches-(atp|wta)-(\d{4})s\.json\.gz$/.exec(name)
  if (partition) return `${partition[1]}:${partition[2]}s`
  if (name.startsWith('piece-wta-')) return 'wta:records'
  if (name.startsWith('piece-')) return 'atp:records'
  if (name === 'manifest.json.gz') return 'control:manifest'
  return `shared:${name.slice(0, -8)}`
}

function validDescriptor(descriptor) {
  if (![1, 2].includes(descriptor?.schema) || !/^[a-f0-9]{7,40}$/.test(descriptor.sourceCommit || '')
    || !/^[a-f0-9]{20}$/.test(descriptor.datasetVersion || '') || !Array.isArray(descriptor.files)) return false
  const names = new Set()
  for (const file of descriptor.files) {
    if (!safeName(file?.name) || !Number.isSafeInteger(file.bytes) || file.bytes < 1 || !/^[a-f0-9]{64}$/.test(file.sha256 || '') || names.has(file.name)) return false
    names.add(file.name)
  }
  return names.has('manifest.json.gz')
}

async function exportSnapshot() {
  const reading = await access(join(cachedReading, 'manifest.json.gz')).then(() => cachedReading).catch(() => workingReading)
  const manifest = JSON.parse(gunzipSync(await readFile(join(reading, 'manifest.json.gz'))).toString())
  const commit = process.env.DEUCE_SOURCE_COMMIT || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  if (!/^[a-f0-9]{7,40}$/.test(commit)) throw new Error('Snapshot source commit is invalid')
  const target = resolve(argument('output') || process.env.DEUCE_SNAPSHOT_EXPORT_DIR || join(root, '.deuce-cache', 'snapshots', `${commit.slice(0, 12)}-${manifest.version}`))
  await mkdir(dirname(target), { recursive: true })
  const temporary = await mkdtemp(join(dirname(target), '.snapshot-export-'))
  let reused = 0, written = 0
  try {
    const files = []
    for (const name of await filesAt(reading)) {
      const source = join(reading, name)
      const body = await readFile(source)
      const file = { name, cohort: cohortFor(name), bytes: body.length, sha256: hash(body) }
      const previous = join(target, name)
      if (await sameFile(previous, file)) { await cloneFile(previous, join(temporary, name)); reused++ }
      else { await cloneFile(source, join(temporary, name)); written++ }
      files.push(file)
    }
    const descriptor = {
      schema: 2, sourceCommit: commit, datasetVersion: manifest.version, generatedAt: manifest.generatedAt,
      matchCount: manifest.matchCount, tours: manifest.summary?.tours || {}, rulesVersion: manifest.rulesVersion, files,
    }
    await writeFile(join(temporary, 'snapshot-manifest.json'), JSON.stringify(descriptor, null, 2) + '\n', { flag: 'wx' })
    await promoteDirectory(temporary, target, false)
    console.log(JSON.stringify({ status: 'exported', target, ...descriptor, files: files.length, reused, written }, null, 2))
  } finally { await rm(temporary, { recursive: true, force: true }) }
}

async function readSource(reference) {
  if (/^https:\/\//.test(reference)) {
    const response = await fetch(reference, { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
    if (!response.ok) throw new Error(`Snapshot manifest HTTP ${response.status}`)
    return { descriptor: await response.json(), read: async name => {
      const response = await fetch(new URL(name, reference), { signal: AbortSignal.timeout(120_000), cache: 'no-store' })
      if (!response.ok) throw new Error(`Snapshot file ${name}: HTTP ${response.status}`)
      return Buffer.from(await response.arrayBuffer())
    } }
  }
  const path = resolve(reference)
  const manifestPath = (await stat(path)).isDirectory() ? join(path, 'snapshot-manifest.json') : path
  return { descriptor: JSON.parse(await readFile(manifestPath, 'utf8')), read: name => readFile(join(dirname(manifestPath), name)) }
}

async function restoreSnapshot() {
  const reference = argument('manifest') || process.env.DEUCE_SNAPSHOT_MANIFEST_URL
  if (!reference) throw new Error('DEUCE_SNAPSHOT_MANIFEST_URL or --manifest is required')
  const { descriptor, read } = await readSource(reference)
  if (!validDescriptor(descriptor)) throw new Error('Snapshot manifest is invalid')
  const expectedCommit = argument('commit') || process.env.DEUCE_EXPECTED_SNAPSHOT_COMMIT
  if (expectedCommit && !String(descriptor.sourceCommit || '').startsWith(expectedCommit)) throw new Error('Snapshot source commit does not match the approved commit')
  const reading = resolve(argument('target') || process.env.DEUCE_SNAPSHOT_TARGET_DIR || workingReading)
  await mkdir(dirname(reading), { recursive: true })
  const temporary = await mkdtemp(join(dirname(reading), '.reading-restore-'))
  let reused = 0, downloaded = 0
  try {
    for (const file of descriptor.files) {
      const current = join(reading, file.name)
      const destination = join(temporary, file.name)
      if (await sameFile(current, file)) { await cloneFile(current, destination); reused++; continue }
      const body = await read(file.name)
      if (body.length !== file.bytes || hash(body) !== file.sha256) throw new Error(`Snapshot checksum mismatch: ${file.name}`)
      await writeFile(destination, body, { flag: 'wx' }); downloaded++
    }
    const manifest = JSON.parse(gunzipSync(await readFile(join(temporary, 'manifest.json.gz'))).toString())
    if (manifest.version !== descriptor.datasetVersion || manifest.matchCount !== descriptor.matchCount || manifest.rulesVersion !== descriptor.rulesVersion) throw new Error('Snapshot manifest and bundled generation disagree')
    for (const [tour, count] of Object.entries(descriptor.tours || {})) if (manifest.summary?.tours?.[tour] !== count) throw new Error(`Snapshot ${tour} count mismatch`)
    const rollback = await promoteDirectory(temporary, reading, true)
    console.log(JSON.stringify({ status: 'restored', sourceCommit: descriptor.sourceCommit, datasetVersion: descriptor.datasetVersion, matches: descriptor.matchCount, tours: descriptor.tours, reused, downloaded, rollback }))
  } finally { await rm(temporary, { recursive: true, force: true }) }
}

async function rollbackSnapshot() {
  const reading = resolve(argument('target') || process.env.DEUCE_SNAPSHOT_TARGET_DIR || workingReading)
  const rollback = `${reading}.rollback`
  await access(join(reading, 'manifest.json.gz'))
  await access(join(rollback, 'manifest.json.gz'))
  const swap = `${reading}.swap-${process.pid}`
  await rm(swap, { recursive: true, force: true })
  await rename(reading, swap)
  try { await rename(rollback, reading) }
  catch (error) { await rename(swap, reading); throw error }
  try { await rename(swap, rollback) }
  catch (error) {
    await rename(reading, rollback)
    await rename(swap, reading)
    throw error
  }
  await syncDirectory(dirname(reading))
  const manifest = JSON.parse(gunzipSync(await readFile(join(reading, 'manifest.json.gz'))).toString())
  console.log(JSON.stringify({ status: 'rolled-back', datasetVersion: manifest.version, matches: manifest.matchCount, target: reading }))
}

const command = process.argv[2]
if (command === 'export') await exportSnapshot()
else if (command === 'restore') await restoreSnapshot()
else if (command === 'rollback') await rollbackSnapshot()
else throw new Error(`Usage: node ${basename(process.argv[1])} export|restore|rollback`)
