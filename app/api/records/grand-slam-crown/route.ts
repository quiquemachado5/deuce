import { DATASET_CACHE_CONTROL } from '@/lib/http-cache';
import { preparedCompactSelection, preparedGeneration } from '@/lib/revista/read-records';
import { eligibleMatch } from '@/lib/quality';
import { roundPosition, winnerName } from '@/lib/editorial';

export async function GET(request:Request) {
  const generation = await preparedGeneration();
  const tour=new URL(request.url).searchParams.get('tour')==='wta'?'wta':'atp';
  const matches = (await preparedCompactSelection({tour,categories:['Grand Slam'],rounds:['Final']}))
    .filter(match => (match.tour||'atp')===tour&&eligibleMatch(match) && match.category === 'Grand Slam' && roundPosition(match.round) === 7)
    .sort((a, b) => a.year - b.year || a.score_summary.timestamp.localeCompare(b.score_summary.timestamp));
  const totals = new Map<string, number>();
  const years: Array<{ year: number; leaders: string[]; total: number }> = [];
  for (const year of [...new Set(matches.map(match => match.year))]) {
    for (const match of matches.filter(entry => entry.year === year)) {
      const winner = winnerName(match);
      if (winner) totals.set(winner, (totals.get(winner) || 0) + 1);
    }
    const total = Math.max(0, ...totals.values());
    years.push({ year, total, leaders: [...totals].filter(([, value]) => value === total).map(([name]) => name).sort((a,b) => a.localeCompare(b,'es')) });
  }
  return Response.json({ years, tour,calculatedAt:generation.manifest.generatedAt,generation:generation.manifest.version, scope: 'Grand Slam del archivo desde 1968' }, { headers: { 'Cache-Control': DATASET_CACHE_CONTROL } });
}
