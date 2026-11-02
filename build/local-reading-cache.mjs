import { cp, mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const workingReading = join(process.cwd(), 'data', 'reading')
export const cachedReading = join(process.cwd(), '.deuce-cache', 'reading')

async function renameIfPresent(source, target) {
  try { await rename(source, target); return true }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error }
}

export async function replaceCachedReading(source = workingReading) {
  const parent = dirname(cachedReading)
  await mkdir(parent, { recursive: true })
  const stagingRoot = await mkdtemp(join(parent, '.reading-stage-'))
  const staging = join(stagingRoot, 'reading')
  const previous = `${cachedReading}.previous-${process.pid}`
  await cp(source, staging, { recursive: true })
  await rm(previous, { recursive: true, force: true })
  const hadPrevious = await renameIfPresent(cachedReading, previous)
  try { await rename(staging, cachedReading) }
  catch (error) {
    if (hadPrevious) await rename(previous, cachedReading)
    throw error
  }
  await rm(previous, { recursive: true, force: true })
  await rm(stagingRoot, { recursive: true, force: true })
}

export async function preserveWorkingReading() {
  const backupRoot = await mkdtemp(join(process.env.TMPDIR || '/tmp', 'deuce-reading-before-task-'))
  const backup = join(backupRoot, 'reading')
  await cp(workingReading, backup, { recursive: true })
  return async () => {
    await rm(workingReading, { recursive: true, force: true })
    await rename(backup, workingReading)
    await rm(backupRoot, { recursive: true, force: true })
  }
}
