import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { reconcileSeasonResults, type SeasonCheckpoint } from '../lib/result-refresh';
import { isProviderFreeHistoryLimit } from '../lib/provider-quota';
import { WTA_HISTORICAL_ARCHIVE_LEVELS, WTA_HISTORICAL_FIRST_YEAR, WTA_HISTORICAL_LAST_YEAR } from '../lib/wta-backfill-schedule';

type Row = { id: unknown; [key: string]: unknown };
type SavedCohort = { data: Row[]; complete: boolean; at: string; scope?: string; nextOffset?: number; total?: number | null };
const api = 'https://api.livetennisapi.com/api/public/v1';
const outputRoot = join(process.cwd(), 'data', 'archive', 'wta');
const checkpointRoot = join(process.cwd(), '.deuce-cache', 'wta');
const key = process.env.TENNIS_API_KEY;
const requested = Number(process.argv.find(arg => arg.startsWith('--max-calls='))?.split('=')[1] || 90);
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let calls = 0;
let allowance = 0;

async function readGzip<T>(file: string): Promise<T | undefined> {
  try { return JSON.parse(gunzipSync(await readFile(file)).toString()) as T; } catch { return undefined; }
}
async function writeGzip(file: string, value: unknown) {
  await mkdir(file.slice(0, file.lastIndexOf('/')), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, gzipSync(JSON.stringify(value)));
  await rename(temporary, file);
}
async function request(path: string) {
  if (calls >= allowance) throw new Error('DAILY_BUDGET_REACHED');
  if (calls) await pause(2_100); // The free plan allows 30 calls per minute.
  calls++;
  const response = await fetch(`${api}${path}`, { headers: { 'X-API-Key': key! }, signal: AbortSignal.timeout(25_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = String(body?.detail || body?.message || 'request failed');
    if (isProviderFreeHistoryLimit(response.status, body)) throw new Error('HISTORY_LIMIT_REACHED');
    throw new Error(`Provider ${response.status}: ${detail}`);
  }
  return body;
}
async function usage() {
  const response = await fetch(`${api}/usage`, { headers: { 'X-API-Key': key! }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Cannot read provider quota (${response.status})`);
  return response.json();
}

async function modernSeason(season: number, currentYear: number) {
  const destination = join(outputRoot, `modern-${season}.json.gz`);
  const saved = await readGzip<SavedCohort>(destination);
  if (season < currentYear && saved?.complete) return { skipped: true, rows: saved.data.length };
  const checkpointFile = join(checkpointRoot, `modern-${season}.json.gz`);
  const resume = await readGzip<SeasonCheckpoint>(checkpointFile);
  const previous = saved ? { scope: saved.scope, at: saved.at, data: saved.data } : null;
  const result = await reconcileSeasonResults(season, currentYear, previous, request, 'wta', {
    resume,
    save: checkpoint => writeGzip(checkpointFile, checkpoint),
  });
  if (result.data.some(row => row.tour !== 'wta')) throw new Error(`Circuit contamination in WTA ${season}`);
  await writeGzip(destination, { ...result, complete: true });
  await rm(checkpointFile, { force: true });
  return { skipped: false, rows: result.data.length, fresh: result.fresh.length };
}

async function archiveCohort(season: number, level: string) {
  const id = `${season}-${level}`;
  const destination = join(outputRoot, `archive-${id}.json.gz`);
  const saved = await readGzip<SavedCohort>(destination);
  if (saved?.complete) return { skipped: true, rows: saved.data.length };
  const checkpointFile = join(checkpointRoot, `archive-${id}.json.gz`);
  const checkpoint = await readGzip<SavedCohort>(checkpointFile);
  const rows = new Map<string, Row>((checkpoint?.data || []).map(row => [String(row.id), row]));
  let offset = checkpoint?.nextOffset || 0;
  let total = checkpoint?.total ?? null;
  for (;;) {
    const page = await request(`/history/archive/matches?tour=wta&level=${level}&from=${season}-01-01&to=${season}-12-31&limit=200&offset=${offset}`);
    if (!Array.isArray(page.data) || typeof page.meta?.has_more !== 'boolean') throw new Error(`Unexpected archive page ${id}`);
    for (const row of page.data) {
      if (row.tour && row.tour !== 'wta') throw new Error(`Circuit contamination in WTA ${id}`);
      rows.set(String(row.id), { ...row, tour: 'wta' });
    }
    total = Number.isSafeInteger(page.meta.total) ? page.meta.total : total;
    const step = Number(page.meta.limit);
    if (page.meta.has_more && (!Number.isSafeInteger(step) || step <= 0)) throw new Error(`Invalid archive pagination ${id}`);
    offset = page.meta.has_more ? offset + step : 0;
    const state = { data: [...rows.values()], complete: !page.meta.has_more, at: new Date().toISOString(), nextOffset: offset, total };
    await writeGzip(checkpointFile, state);
    if (!page.meta.has_more) {
      if (total !== null && rows.size !== total) throw new Error(`Incomplete archive cohort ${id}: ${rows.size}/${total}`);
      await writeGzip(destination, state);
      await rm(checkpointFile, { force: true });
      return { skipped: false, rows: rows.size };
    }
  }
}

async function main() {
  if (!key) throw new Error('TENNIS_API_KEY is required');
  await mkdir(outputRoot, { recursive: true });
  await mkdir(checkpointRoot, { recursive: true });
  const quota = await usage();
  const remaining = Number(quota.today?.remaining_day || 0);
  allowance = Math.max(0, Math.min(Number.isFinite(requested) ? requested : 90, remaining - 5));
  const report: Record<string, unknown> = { startedAt: new Date().toISOString(), availableAtStart: remaining, callBudget: allowance, modern: [], archive: [] };
  const currentYear = new Date().getUTCFullYear();
  try {
    for (let season = currentYear; season >= 2023; season--) {
      (report.modern as unknown[]).push({ season, ...await modernSeason(season, currentYear) });
    }
    // Keep the provider's broad historical cohorts locally. Publication later
    // applies the strict Grand Slam/1000/500/250 singles contract; retaining
    // G/M/A here lets future, evidence-backed tier mappings recover eligible
    // WTA events without another multi-year download.
    for (let season = WTA_HISTORICAL_LAST_YEAR; season >= WTA_HISTORICAL_FIRST_YEAR; season--)
      for (const level of WTA_HISTORICAL_ARCHIVE_LEVELS) {
      (report.archive as unknown[]).push({ season, level, ...await archiveCohort(season, level) });
    }
  } catch (error) {
    if (!(error instanceof Error) || !['DAILY_BUDGET_REACHED','HISTORY_LIMIT_REACHED'].includes(error.message)) throw error;
    report.paused = error.message === 'HISTORY_LIMIT_REACHED' ? 'free-history-limit' : 'daily-quota-checkpoint';
  }
  report.calls = calls;
  report.finishedAt = new Date().toISOString();
  const checkpoint = await readGzip<SeasonCheckpoint>(join(checkpointRoot, `modern-${currentYear}.json.gz`));
  const completedFiles = (await readdir(outputRoot)).filter(file => /^archive-\d{4}-[GMA]\.json\.gz$/.test(file));
  report.active = checkpoint ? { kind: 'modern', season: currentYear, rows: checkpoint.rows.length, offset: checkpoint.offset, complete: false } : null;
  report.completedHistoricalCohorts = completedFiles.length;
  await writeFile(join(checkpointRoot, 'last-run.json'), JSON.stringify(report, null, 2));
  await writeFile(join(process.cwd(), 'data', 'archive', 'wta-status.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'WTA backfill failed'); process.exitCode = 1; });
