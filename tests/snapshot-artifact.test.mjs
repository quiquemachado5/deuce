import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { gzipSync, gunzipSync } from 'node:zlib'

const execute = promisify(execFile)
const repository = process.cwd()
const script = join(repository, 'build', 'snapshot-artifact.mjs')
const sha256 = body => createHash('sha256').update(body).digest('hex')
const manifestBody = version => gzipSync(JSON.stringify({ version, matchCount: 2, rulesVersion: 'rules-test', summary: { tours: { atp: 1, wta: 1 } } }))

async function writeSource(directory, version, shared) {
  await mkdir(directory, { recursive: true })
  const manifest = manifestBody(version)
  const files = [
    { name: 'manifest.json.gz', body: manifest },
    { name: 'matches-atp-2020s.json.gz', body: shared },
  ]
  for (const file of files) await writeFile(join(directory, file.name), file.body)
  await writeFile(join(directory, 'snapshot-manifest.json'), JSON.stringify({
    schema: 2, sourceCommit: 'a'.repeat(40), datasetVersion: version, matchCount: 2,
    rulesVersion: 'rules-test', tours: { atp: 1, wta: 1 },
    files: files.map(file => ({ name: file.name, cohort: 'test', bytes: file.body.length, sha256: sha256(file.body) })),
  }))
}

test('snapshot restore reuses unchanged cohorts, promotes safely offline and supports rollback', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'deuce-snapshot-'))
  const source = join(temporary, 'source'), target = join(temporary, 'reading')
  const before = '1'.repeat(20), after = '2'.repeat(20), shared = gzipSync(JSON.stringify([{ id: 'stable' }]))
  try {
    await writeSource(source, after, shared)
    await mkdir(target)
    await writeFile(join(target, 'manifest.json.gz'), manifestBody(before))
    await writeFile(join(target, 'matches-atp-2020s.json.gz'), shared)

    const restored = JSON.parse((await execute(process.execPath, [script, 'restore', `--manifest=${source}`, `--target=${target}`], { cwd: repository })).stdout)
    assert.equal(restored.reused, 1)
    assert.equal(restored.downloaded, 1)
    assert.equal(JSON.parse(gunzipSync(await readFile(join(target, 'manifest.json.gz')))).version, after)
    assert.equal(JSON.parse(gunzipSync(await readFile(join(`${target}.rollback`, 'manifest.json.gz')))).version, before)

    const rolledBack = JSON.parse((await execute(process.execPath, [script, 'rollback', `--target=${target}`], { cwd: repository })).stdout)
    assert.equal(rolledBack.datasetVersion, before)
    assert.equal(JSON.parse(gunzipSync(await readFile(join(target, 'manifest.json.gz')))).version, before)
    assert.equal(JSON.parse(gunzipSync(await readFile(join(`${target}.rollback`, 'manifest.json.gz')))).version, after)
  } finally { await rm(temporary, { recursive: true, force: true }) }
})

test('snapshot checksum failure preserves the active generation', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'deuce-snapshot-failure-'))
  const source = join(temporary, 'source'), target = join(temporary, 'reading')
  const before = '3'.repeat(20), after = '4'.repeat(20)
  try {
    await writeSource(source, after, gzipSync('new'))
    const descriptorPath = join(source, 'snapshot-manifest.json')
    const descriptor = JSON.parse(await readFile(descriptorPath, 'utf8'))
    descriptor.files[1].sha256 = 'f'.repeat(64)
    await writeFile(descriptorPath, JSON.stringify(descriptor))
    await mkdir(target)
    await writeFile(join(target, 'manifest.json.gz'), manifestBody(before))

    await assert.rejects(execute(process.execPath, [script, 'restore', `--manifest=${source}`, `--target=${target}`], { cwd: repository }), /Snapshot checksum mismatch/)
    assert.equal(JSON.parse(gunzipSync(await readFile(join(target, 'manifest.json.gz')))).version, before)
  } finally { await rm(temporary, { recursive: true, force: true }) }
})

test('snapshot export records cohorts and reuses identical hashed files', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'deuce-snapshot-export-'))
  const reading = join(temporary, 'data', 'reading'), target = join(temporary, 'export')
  const version = '5'.repeat(20), shared = gzipSync(JSON.stringify([{ id: 'stable' }]))
  const environment = { ...process.env, DEUCE_SOURCE_COMMIT: 'b'.repeat(40) }
  try {
    await mkdir(reading, { recursive: true })
    await writeFile(join(reading, 'manifest.json.gz'), manifestBody(version))
    await writeFile(join(reading, 'matches-atp-2020s.json.gz'), shared)
    const first = JSON.parse((await execute(process.execPath, [script, 'export', `--output=${target}`], { cwd: temporary, env: environment })).stdout)
    assert.equal(first.written, 2)
    assert.equal(first.reused, 0)
    const descriptor = JSON.parse(await readFile(join(target, 'snapshot-manifest.json'), 'utf8'))
    assert.equal(descriptor.schema, 2)
    assert.equal(descriptor.files.find(file => file.name === 'matches-atp-2020s.json.gz')?.cohort, 'atp:2020s')

    const second = JSON.parse((await execute(process.execPath, [script, 'export', `--output=${target}`], { cwd: temporary, env: environment })).stdout)
    assert.equal(second.written, 0)
    assert.equal(second.reused, 2)
  } finally { await rm(temporary, { recursive: true, force: true }) }
})
