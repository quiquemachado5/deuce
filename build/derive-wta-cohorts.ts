import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { deriveWtaCohortsFromBroadArchive, sameWtaCohortRows } from '../lib/wta-cohort-derivation';

const root = join(process.cwd(), 'data', 'archive', 'wta');
const sourcePattern = /^archive-(20\d{2})-A\.json\.gz$/;
const requestedArgument = process.argv.find(argument => argument.startsWith('--years='))?.split('=')[1];
const requestedYears = requestedArgument?.split(',').map(value => Number(value.trim()));
if (requestedYears?.some(year => !Number.isSafeInteger(year))) throw new Error('Years must be comma-separated integers');
const dryRun = process.argv.includes('--dry-run');

async function decode(file: string) {
  return JSON.parse(gunzipSync(await readFile(file)).toString()) as unknown;
}

async function main() {
  const sources = (await readdir(root))
    .flatMap(file => {
      const match = sourcePattern.exec(file);
      return match ? [{ file, year: Number(match[1]) }] : [];
    })
    .filter(source => !requestedYears?.length || requestedYears.includes(source.year))
    .sort((a, b) => a.year - b.year);
  if (!sources.length) throw new Error('No complete WTA broad archive was selected');
  const missingSources = requestedYears?.filter(year => !sources.some(source => source.year === year)) || [];
  if (missingSources.length) throw new Error(`Missing WTA broad archive for: ${missingSources.join(', ')}`);

  const report: Array<{ id: string; rows: number; status: 'created' | 'verified' | 'planned' }> = [];
  for (const source of sources) {
    const cohorts = deriveWtaCohortsFromBroadArchive(await decode(join(root, source.file)), source.year);
    for (const [id, cohort] of Object.entries(cohorts)) {
      const destination = join(root, `archive-${id}.json.gz`);
      try {
        const existing = await decode(destination);
        if (!sameWtaCohortRows(existing, cohort)) throw new Error(`Refusing to replace a different WTA cohort: ${id}`);
        report.push({ id, rows: cohort.total, status: 'verified' });
        continue;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (dryRun) {
        report.push({ id, rows: cohort.total, status: 'planned' });
        continue;
      }
      const temporary = `${destination}.tmp`;
      await writeFile(temporary, gzipSync(JSON.stringify(cohort)));
      await rename(temporary, destination);
      report.push({ id, rows: cohort.total, status: 'created' });
    }
  }
  console.log(JSON.stringify({ verified: true, dryRun, cohorts: report, rows: report.reduce((sum, item) => sum + item.rows, 0) }));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'WTA cohort derivation failed');
  process.exitCode = 1;
});
