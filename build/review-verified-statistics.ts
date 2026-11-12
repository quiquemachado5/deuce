import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { statisticRegistry, statisticVerification } from '../lib/verified-statistics';
import { observedSlamStageSequence, observedTournamentTitles } from '../lib/reference-statistics-audit';
import type { Match } from '../lib/types';

async function main() {
  const directory = process.env.DEUCE_READING_DIR || '.deuce-cache/reading';
  const read = async (key: string) => JSON.parse(gunzipSync(await readFile(`${directory}/${key}.json.gz`)).toString());
  const [matches, manifest] = await Promise.all([read('matches') as Promise<Match[]>, read('manifest')]);
  const references = statisticRegistry.facts.map(fact => ({ id: fact.id, tour: fact.tour, ...statisticVerification(fact, statisticRegistry.sources) }));
  if (new Set(references.map(fact => fact.id)).size !== references.length) throw new Error('Duplicate reference statistic identifier');
  if (references.some(fact => !fact.accepted)) throw new Error('A reference statistic failed the independent-publication requirement');
  const start = { year: 2004, tournament: 'Wimbledon' };
  const checks = [
    { id: 'federer-10-slam-finals', reference: 10, ...observedSlamStageSequence(matches, 'atp', 'Roger Federer', { year: 2005, tournament: 'Wimbledon' }, { year: 2007, tournament: 'US Open' }, 7) },
    { id: 'federer-23-slam-semis', reference: 23, ...observedSlamStageSequence(matches, 'atp', 'Roger Federer', start, { year: 2010, tournament: 'Australian Open' }, 6) },
    { id: 'federer-36-slam-quarters', reference: 36, ...observedSlamStageSequence(matches, 'atp', 'Roger Federer', start, { year: 2013, tournament: 'Roland Garros' }, 5) },
    { id: 'nadal-14-roland-garros', reference: 14, observed: observedTournamentTitles(matches, 'atp', 'Rafael Nadal', 'Roland Garros', 2005, 2022).value },
  ].map(check => ({ ...check, agrees: check.observed === check.reference }));
  const report = { schema: 1, reviewedAt: new Date().toISOString(), datasetVersion: manifest.version, matches: matches.length,
    accepted: references.length, reviewedPages: Object.keys(statisticRegistry.sources).length, references, checks,
    policy: 'At least two distinct pages, publishers and editorial origins for explicitly reviewed additions; existing three-source facts retain that threshold; same singles circuit, metric, period and units. Conflicts cannot be outvoted. Reference facts never overwrite match results.' };
  await mkdir('data/research', { recursive: true });
  await writeFile('data/research/verified-statistics-audit-2026-11-11.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ accepted: report.accepted, reviewedPages: report.reviewedPages, datasetVersion: manifest.version, checks: checks.map(({ id, reference, observed, agrees }) => ({ id, reference, observed, agrees })) }, null, 2));
  if (checks.some(check => !check.agrees)) throw new Error('Archive/reference disagreement: report saved; do not certify the archive from these checks');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
