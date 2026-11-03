import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { assertWtaCohortBaseline, auditWtaCohorts, type WtaCohortBaseline } from '../lib/wta-cohort-audit';
import { wtaHistoricalCohortIds } from '../lib/wta-backfill-schedule';

async function main() {
  const root = join(process.cwd(), 'data', 'archive', 'wta');
  const payloads = new Map<string, unknown>();
  for (const id of wtaHistoricalCohortIds()) {
    try {
      payloads.set(id, JSON.parse(gunzipSync(await readFile(join(root, `archive-${id}.json.gz`))).toString()));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(`Cannot read WTA cohort ${id}`, { cause: error });
    }
  }
  const coverage = auditWtaCohorts(payloads);
  const baseline = JSON.parse(await readFile(join(process.cwd(), 'ops', 'wta-history-baseline.json'), 'utf8')) as WtaCohortBaseline;
  assertWtaCohortBaseline(coverage, baseline);
  if (process.argv.includes('--require-complete') && coverage.pending.length) {
    throw new Error(`WTA history is incomplete: ${coverage.completed}/${coverage.total}; pending ${coverage.pending.join(', ')}`);
  }
  console.log(JSON.stringify({ verified: true, baseline, ...coverage }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'WTA cohort audit failed'); process.exitCode = 1; });
