import type { Match } from './types';
import { archiveIndex, filterArchive, type ArchiveFilter } from './archive-index';
import { eligibleMatch } from './quality';
import { chronological } from './editorial';
import { SURFACES } from './surface';

export type ComparisonFilter = ArchiveFilter & { age?: string; minimum?: string };
export function comparePlayer(matches: Match[], name: string, q: ComparisonFilter) {
  const base = filterArchive(archiveIndex(matches).players.get(name) || [], q);
  const knownAge = base.filter(m => Number.isFinite(m.player1.name === name ? m.context?.age1 : m.context?.age2));
  const selected = q.age && q.age !== 'all' ? knownAge.filter(m => Math.floor((m.player1.name === name ? m.context!.age1 : m.context!.age2)!) === Number(q.age)) : base;
  const eligible = selected.filter(eligibleMatch).sort(chronological);
  const won = eligible.filter(m => m.winner === (m.player1.name === name ? 1 : 2)).length;
  const finals = eligible.filter(m => m.round.toLowerCase() === 'final');
  const ranking = eligible.filter(m => m.context?.rankLabel === 'Ranking al jugar' && Number(m.player1.name === name ? m.context.rank2 : m.context.rank1) > 0);
  const top10 = ranking.filter(m => Number(m.player1.name === name ? m.context!.rank2 : m.context!.rank1) <= 10);
  const surfaces = SURFACES.map(surface => {
    const sample = eligible.filter(match => match.surface === surface);
    const surfaceWon = sample.filter(match => match.winner === (match.player1.name === name ? 1 : 2)).length;
    return { surface, played: sample.length, won: surfaceWon, rate: sample.length ? surfaceWon / sample.length * 100 : null };
  });
  const minimum = ['5', '20', '50'].includes(q.minimum || '') ? Number(q.minimum) : 20;
  return { name, matches: eligible, base: base.length, ageCoverage: knownAge.length, excluded: selected.length - eligible.length,
    played: eligible.length, won, lost: eligible.length - won, minimum, sufficient: eligible.length >= minimum,
    rate: eligible.length ? won / eligible.length * 100 : null,
    finals: finals.length, titles: finals.filter(m => m.winner === (m.player1.name === name ? 1 : 2)).length,
    surfaces,
    ranking: ranking.length, top10Played: top10.length, top10Won: top10.filter(m => m.winner === (m.player1.name === name ? 1 : 2)).length,
    stats: eligible.filter(m => m.statistics.length).length, exactDates: eligible.filter(m => m.context?.dateLabel === 'Fecha del partido').length,
  };
}
