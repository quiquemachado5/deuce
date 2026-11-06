import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { archiveMatches } from '../lib/live-tennis';
import { detailMatchesCandidate, type DetailCandidate } from '../lib/enrichment-plan';
import { hasClosedModernResult } from '../lib/modern-result';
import { providerRemainingCalls } from '../lib/provider-quota';
import { eligibleMatch, prepareMatch } from '../lib/quality';

const base = 'https://api.livetennisapi.com/api/public/v1';
const key = process.env.TENNIS_API_KEY;
if (!key) throw new Error('TENNIS_API_KEY is required');

const argument = (name: string, fallback: number) => {
  const raw = process.argv.find(value => value.startsWith(`--${name}=`))?.split('=')[1];
  const parsed = Number(raw ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
};
const maximum = argument('max-calls', 300);
const reserve = argument('reserve', 250);
const startYear = argument('from-year', 2023);
const currentYear = new Date().getUTCFullYear();
const headers = { 'X-API-Key': key };

type ProviderPayload = Record<string, unknown> & { match?: Record<string, unknown> };
async function provider(path: string): Promise<ProviderPayload> {
  const response = await fetch(`${base}${path}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  const payload = await response.json().catch(() => ({})) as ProviderPayload;
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}: ${String(payload.detail || payload.message || response.statusText).slice(0, 140)}`);
  return payload;
}

const roundPriority = (round: string) => ({ Final: 0, Semifinal: 1, 'Cuartos de final': 2, 'Octavos de final': 3 }[round] ?? 4);
const categoryPriority = (category: string) => category === 'Grand Slam' ? 0 : /1000/.test(category) ? 1 : /500/.test(category) ? 2 : 3;

async function main() {
  const usage = await provider('/usage');
  const remaining = providerRemainingCalls(usage);
  if (!Number.isFinite(remaining)) throw new Error('Provider usage did not include remaining_day');
  const budget = Math.max(0, Math.min(maximum, remaining - reserve));
  if (budget === 0) throw new Error(`Daily reserve protected: ${remaining} calls remain, ${reserve} reserved`);

  const candidates: Array<{ candidate: DetailCandidate; category: string; round: string }> = [];
  for (let year = startYear; year <= currentYear; year++) {
    // Load saved details so a previously repaired row is not charged again.
    for (const match of await archiveMatches(year)) {
      if (!/^(?:wta-)?live-\d+$/.test(match.match_id) || match.status.toLowerCase() !== 'finished' || eligibleMatch(prepareMatch(match))) continue;
      const tour = match.tour === 'wta' ? 'wta' : 'atp';
      candidates.push({
        candidate: { kind: 'modern', id: match.match_id.replace(/^(?:wta-)?live-/, ''), year, round: match.round, tour, players: [match.player1.name, match.player2.name] },
        category: match.category,
        round: match.round,
      });
    }
  }
  candidates.sort((a, b) => roundPriority(a.round) - roundPriority(b.round)
    || categoryPriority(a.category) - categoryPriority(b.category)
    || b.candidate.year - a.candidate.year
    || a.candidate.tour.localeCompare(b.candidate.tour)
    || a.candidate.id.localeCompare(b.candidate.id));

  const directory = join(process.cwd(), 'data', 'archive', 'details');
  await mkdir(directory, { recursive: true });
  let calls = 0, repaired = 0, rejected = 0, unavailable = 0;
  for (const { candidate } of candidates) {
    if (calls >= budget) break;
    // Stay below the documented 60 requests/minute provider ceiling.
    await new Promise(resolve => setTimeout(resolve, 1_100));
    calls++;
    try {
      const payload = await provider(`/history/matches/${candidate.id}?points=complete`);
      if (!detailMatchesCandidate(candidate, payload) || !payload.match || !hasClosedModernResult(payload.match)) {
        rejected++;
        continue;
      }
      const filename = `${candidate.tour === 'wta' ? 'wta-' : ''}modern-${candidate.id}.json.gz`;
      const target = join(directory, filename), temporary = `${target}.${process.pid}.tmp`;
      await writeFile(temporary, gzipSync(JSON.stringify(payload)), { mode: 0o600 });
      await rename(temporary, target);
      repaired++;
    } catch (error) {
      if (error instanceof Error && /HTTP 404/.test(error.message)) { unavailable++; continue; }
      throw error;
    }
  }
  console.log(JSON.stringify({ candidates: candidates.length, budget, calls, repaired, rejected, unavailable, reserve }, null, 2));
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Modern result repair failed'); process.exitCode = 1; });
