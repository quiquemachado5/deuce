import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { buildIntegrityRepairQueue, type RepairLedger } from '../lib/integrity-repair-queue';
import type { CoverageReconciliation } from '../lib/coverage-reconciliation';

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const source = resolve(argument('source') || 'data/reading/reconciliation.json.gz');
  const ledgerPath = resolve(argument('ledger') || 'ops/integrity-repair-ledger.json');
  const base = process.env.DEUCE_ARCHIVE_DIR || '.deuce-cache';
  const output = resolve(argument('output') || join(base, 'integrity', 'repair-queue.json'));
  const [compressed, ledgerText] = await Promise.all([readFile(source), readFile(ledgerPath, 'utf8')]);
  const report = JSON.parse(gunzipSync(compressed).toString('utf8')) as CoverageReconciliation;
  const ledger = JSON.parse(ledgerText) as RepairLedger;
  const queue = buildIntegrityRepairQueue(report, ledger);
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(queue, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, output);
  console.log(`Integrity queue: ${queue.summary.active} active (${queue.summary.atp} ATP / ${queue.summary.wta} WTA), ${queue.summary.p0} P0. Written to ${output}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Integrity queue failed');
  process.exitCode = 1;
});
