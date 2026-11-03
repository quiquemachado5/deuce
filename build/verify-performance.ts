import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { queryMatchBrowserPage, type MatchBrowserIndex, type MatchBrowserPartition } from '../lib/match-browser-snapshot';

const reading = join(process.cwd(), 'data', 'reading');
const read = async <T>(id: string): Promise<T> => JSON.parse(gunzipSync(await readFile(join(reading, `${id}.json.gz`))).toString()) as T;
const cases = [
  { q: 'Nadal Roland Garros' },
  { q: 'Serena Williams US Open' },
  { q: 'final 2024 pista dura' },
  { player: 'Novak Djokovic' },
  { player: 'Iga Swiatek', surface: 'clay' },
  { tournament: 'Wimbledon', year: 2023 },
] as const;

async function main() {
  const index = await read<MatchBrowserIndex>('browser-index');
  const partitions = await Promise.all(index.partitions.map(meta => read<MatchBrowserPartition>(`browser-${meta.id}`)));
  for (const filter of cases) queryMatchBrowserPage(partitions, filter, 1, 25);
  const samples: number[] = [];
  for (let round = 0; round < 3; round++) for (const filter of cases) {
    const started = performance.now();
    queryMatchBrowserPage(partitions, filter, 1, 25);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * .95))];
  const maximum = Number(process.env.DEUCE_QUERY_P95_MS || 250);
  if (!Number.isFinite(p95) || p95 > maximum) throw new Error(`Match browser p95 ${p95.toFixed(1)}ms exceeds ${maximum}ms`);
  console.log(JSON.stringify({ status: 'ok', matches: index.count, partitions: partitions.length, samples: samples.length, p95Ms: Number(p95.toFixed(2)), budgetMs: maximum }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
