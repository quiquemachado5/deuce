import 'server-only'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Local derived snapshots live outside Git; production images use data/reading. */
export function readingDirectory() {
  const configured = process.env.DEUCE_READING_DIR?.trim()
  if (configured) return resolve(configured)
  const cached = join(process.cwd(), '.deuce-cache', 'reading')
  return existsSync(join(cached, 'manifest.json.gz')) ? cached : join(process.cwd(), 'data', 'reading')
}
