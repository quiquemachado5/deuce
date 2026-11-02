import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { access, mkdtemp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
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

async function exportSnapshot() {
  const reading = await access(join(cachedReading, 'manifest.json.gz')).then(() => cachedReading).catch(() => workingReading)
  const manifest = JSON.parse(gunzipSync(await readFile(join(reading, 'manifest.json.gz'))).toString())
  const commit = process.env.DEUCE_SOURCE_COMMIT || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  if (!/^[a-f0-9]{7,40}$/.test(commit)) throw new Error('Snapshot source commit is invalid')
  const target = resolve(argument('output') || process.env.DEUCE_SNAPSHOT_EXPORT_DIR || join(root, '.deuce-cache', 'snapshots', `${commit.slice(0, 12)}-${manifest.version}`))
  await mkdir(target, { recursive: true })
  const files = []
  for (const name of await filesAt(reading)) {
    const body = await readFile(join(reading, name))
    await writeFile(join(target, name), body)
    files.push({ name, bytes: body.length, sha256: hash(body) })
  }
  const descriptor = {
    schema: 1, sourceCommit: commit, datasetVersion: manifest.version, generatedAt: manifest.generatedAt,
    matchCount: manifest.matchCount, tours: manifest.summary?.tours || {}, rulesVersion: manifest.rulesVersion, files,
  }
  await writeFile(join(target, 'snapshot-manifest.json'), JSON.stringify(descriptor, null, 2) + '\n')
  console.log(JSON.stringify({ status: 'exported', target, ...descriptor, files: files.length }, null, 2))
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
  if (descriptor?.schema !== 1 || !/^[a-f0-9]{7,40}$/.test(descriptor.sourceCommit || '') || !/^[a-f0-9]{20}$/.test(descriptor.datasetVersion || '') || !Array.isArray(descriptor.files)) throw new Error('Snapshot manifest is invalid')
  const expectedCommit = argument('commit') || process.env.DEUCE_EXPECTED_SNAPSHOT_COMMIT
  if (expectedCommit && !String(descriptor.sourceCommit || '').startsWith(expectedCommit)) throw new Error('Snapshot source commit does not match the approved commit')
  const reading = resolve(argument('target') || process.env.DEUCE_SNAPSHOT_TARGET_DIR || workingReading)
  await mkdir(dirname(reading), { recursive: true })
  const temporary = await mkdtemp(join(dirname(reading), '.reading-restore-'))
  try {
    for (const file of descriptor.files) {
      if (!safeName(file?.name) || !/^[a-f0-9]{64}$/.test(file?.sha256 || '')) throw new Error('Snapshot file descriptor is invalid')
      const body = await read(file.name)
      if (body.length !== file.bytes || hash(body) !== file.sha256) throw new Error(`Snapshot checksum mismatch: ${file.name}`)
      await writeFile(join(temporary, file.name), body, { flag: 'wx' })
    }
    const manifest = JSON.parse(gunzipSync(await readFile(join(temporary, 'manifest.json.gz'))).toString())
    if (manifest.version !== descriptor.datasetVersion || manifest.matchCount !== descriptor.matchCount || manifest.rulesVersion !== descriptor.rulesVersion) throw new Error('Snapshot manifest and bundled generation disagree')
    for (const [tour, count] of Object.entries(descriptor.tours || {})) if (manifest.summary?.tours?.[tour] !== count) throw new Error(`Snapshot ${tour} count mismatch`)
    const previous = `${reading}.previous-${process.pid}`
    await rm(previous, { recursive: true, force: true })
    const hadPrevious = await rename(reading, previous).then(() => true).catch(error => { if (error?.code === 'ENOENT') return false; throw error })
    try { await rename(temporary, reading) } catch (error) { if (hadPrevious) await rename(previous, reading); throw error }
    await rm(previous, { recursive: true, force: true })
    console.log(JSON.stringify({ status: 'restored', sourceCommit: descriptor.sourceCommit, datasetVersion: descriptor.datasetVersion, matches: descriptor.matchCount, tours: descriptor.tours }))
  } finally { await rm(temporary, { recursive: true, force: true }) }
}

const command = process.argv[2]
if (command === 'export') await exportSnapshot()
else if (command === 'restore') await restoreSnapshot()
else throw new Error(`Usage: node ${basename(process.argv[1])} export|restore`)
