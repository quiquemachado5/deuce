import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'
import { verifyBundledDirectory, verifyFilesystemArchiveDirectory } from './restore-validation.mjs'

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

let result
try { await access(join(restored, 'reading-v2-manifest.json')); result = await verifyFilesystemArchiveDirectory(restored) }
catch (error) { if (error?.code !== 'ENOENT') throw error; result = await verifyBundledDirectory(restored) }
console.log(JSON.stringify({ status: 'verified', archiveSha256: archiveHash, location, ...result }, null, 2))
