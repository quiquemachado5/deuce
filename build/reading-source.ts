import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** CLI verification follows the same ignored local snapshot as the app. */
export function readingSource() {
  const configured = process.env.DEUCE_READING_DIR?.trim();
  if (configured) return resolve(configured);
  const cached = join(process.cwd(), '.deuce-cache', 'reading');
  return existsSync(join(cached, 'manifest.json.gz')) ? cached : join(process.cwd(), 'data', 'reading');
}
