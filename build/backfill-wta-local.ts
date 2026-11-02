import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { reconcileSeasonResults, type SeasonCheckpoint } from '../lib/result-refresh';
import { isProviderFreeHistoryLimit, providerQuotaRetryAt } from '../lib/provider-quota';
import {
  WTA_HISTORICAL_ARCHIVE_LEVELS,
  WTA_HISTORICAL_FIRST_YEAR,
  WTA_HISTORICAL_LAST_YEAR,
  WTA_HISTORICAL_PRIORITY_THROUGH_YEAR,
  wtaHistoricalCohortPlan,
  type WtaHistoricalArchiveLevel,
} from '../lib/wta-backfill-schedule';

type Row = { id: unknown; [key: string]: unknown };
type SavedCohort = { data: Row[]; complete: boolean; at: string; scope?: string; nextOffset?: number; total?: number | null };
const api = 'https://api.livetennisapi.com/api/public/v1';
const outputRoot = join(process.cwd(), 'data', 'archive', 'wta');
const checkpointRoot = join(process.cwd(), '.deuce-cache', 'wta');
const key = process.env.TENNIS_API_KEY;
const requested = Number(process.argv.find(arg => arg.startsWith('--max-calls='))?.split('=')[1] || 90);
const historyOnly = process.argv.includes('--history-only');
const integerArgument = (name: string, fallback: number) => {
  const value = Number(process.argv.find(arg => arg.startsWith(`--${name}=`))?.split('=')[1]);
  return Number.isSafeInteger(value) ? value : fallback;
};
const throughYearArgument = process.argv.find(arg => arg.startsWith('--through-year='));
const maximumYear = Math.max(WTA_HISTORICAL_FIRST_YEAR, Math.min(
  WTA_HISTORICAL_LAST_YEAR,
  integerArgument('through-year', WTA_HISTORICAL_LAST_YEAR),
));
const priorityThroughYear = throughYearArgument ? maximumYear : WTA_HISTORICAL_PRIORITY_THROUGH_YEAR;
const firstYear = Math.max(WTA_HISTORICAL_FIRST_YEAR, Math.min(
  maximumYear,
  integerArgument('first-year', WTA_HISTORICAL_FIRST_YEAR),
));
const requestedLevels = process.argv.find(arg => arg.startsWith('--levels='))?.split('=')[1]
  ?.split(',').map(value => value.trim().toUpperCase()).filter(Boolean);
const historicalLevels = (requestedLevels?.length ? requestedLevels : [])
  .filter((value): value is WtaHistoricalArchiveLevel => WTA_HISTORICAL_ARCHIVE_LEVELS.includes(value as WtaHistoricalArchiveLevel));
if (requestedLevels && (!historicalLevels.length || historicalLevels.length !== requestedLevels.length)) {
  throw new Error(`Historical levels must be a comma-separated subset of ${WTA_HISTORICAL_ARCHIVE_LEVELS.join(',')}`);
}
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

function historicalCoverage(rows: Row[]) {
  const players = new Set<string>();
  const tournaments = new Set<string>();
  for (const row of rows) {
    for (const side of [row.winner, row.loser]) {
      if (side && typeof side === 'object' && typeof (side as { name?: unknown }).name === 'string') {
        players.add((side as { name: string }).name);
      }
    }
    if (typeof row.tournament === 'string') tournaments.add(row.tournament);
  }
  return { matches: rows.length, players: players.size, tournaments: tournaments.size };
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
  if (saved?.complete) return { skipped: true, rows: saved.data.length, ...historicalCoverage(saved.data) };
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
      const data = [...rows.values()];
      return { skipped: false, rows: rows.size, ...historicalCoverage(data) };
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
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(), availableAtStart: remaining, callBudget: allowance,
    scope: { tour: 'wta', historyOnly, firstYear, maximumYear, priorityThroughYear,
      levels: historicalLevels.length ? historicalLevels : 'seasonal-provider-levels' },
    modern: [], archive: [],
  };
  const currentYear = new Date().getUTCFullYear();
  try {
    if (!historyOnly) {
      for (let season = currentYear; season >= 2023; season--) {
        (report.modern as unknown[]).push({ season, ...await modernSeason(season, currentYear) });
      }
    }
    // Keep the provider's era-specific historical cohorts locally. Publication
    // later applies the strict Grand Slam/1000/500/250 singles contract.
    const completed = new Set((await readdir(outputRoot))
      .map(file => /^archive-(\d{4}-(?:G|W|T[1-5]|PM|P|I|F))\.json\.gz$/.exec(file)?.[1])
      .filter((value): value is string => !!value));
    const plan = wtaHistoricalCohortPlan(completed, priorityThroughYear, historicalLevels.length ? historicalLevels : undefined)
      .filter(cohort => cohort.season >= firstYear && cohort.season <= maximumYear);
    report.pendingHistoricalCohortsAtStart = plan.length;
    for (const { season, level } of plan) {
      (report.archive as unknown[]).push({ season, level, ...await archiveCohort(season, level) });
    }
  } catch (error) {
    if (!(error instanceof Error) || !['DAILY_BUDGET_REACHED','HISTORY_LIMIT_REACHED'].includes(error.message)) throw error;
    report.paused = error.message === 'HISTORY_LIMIT_REACHED' ? 'free-history-limit' : 'daily-quota-checkpoint';
    report.retryAt = providerQuotaRetryAt(quota);
  }
  report.calls = calls;
  report.finishedAt = new Date().toISOString();
  const checkpoint = await readGzip<SeasonCheckpoint>(join(checkpointRoot, `modern-${currentYear}.json.gz`));
  const completedFiles = (await readdir(outputRoot)).filter(file => /^archive-\d{4}-(?:G|W|T[1-5]|PM|P|I|F)\.json\.gz$/.test(file));
  report.active = checkpoint ? { kind: 'modern', season: currentYear, rows: checkpoint.rows.length, offset: checkpoint.offset, complete: false } : null;
  report.completedHistoricalCohorts = completedFiles.length;
  await writeFile(join(checkpointRoot, 'last-run.json'), JSON.stringify(report, null, 2));
  await writeFile(join(process.cwd(), 'data', 'archive', 'wta-status.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'WTA backfill failed'); process.exitCode = 1; });
