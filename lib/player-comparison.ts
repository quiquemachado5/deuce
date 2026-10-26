import type { Match } from './types';
import { archiveIndex, filterArchive, type ArchiveFilter } from './archive-index';
import { eligibleMatch } from './quality';
import { chronological } from './editorial';
import { SURFACES } from './surface';

export type ComparisonFilter = ArchiveFilter & { age?: string; minimum?: string };
function ageRange(value: string) {
  if (/^\d+\+$/.test(value)) return { first: Number(value.slice(0, -1)), last: Infinity };
  const match = value.match(/^(\d+)-(\d+)$/);
  if (match) return { first: Number(match[1]), last: Number(match[2]) };
  const exact = Number(value);
  return Number.isFinite(exact) ? { first: exact, last: exact } : null;
}
export function comparePlayer(matches: Match[], name: string, q: ComparisonFilter) {
  const base = filterArchive(archiveIndex(matches).players.get(name) || [], q);
  const knownAge = base.filter(m => Number.isFinite(m.player1.name === name ? m.context?.age1 : m.context?.age2));
  const range = q.age && q.age !== 'all' ? ageRange(q.age) : null;
  const selected = range ? knownAge.filter(m => {
    const age = Math.floor((m.player1.name === name ? m.context!.age1 : m.context!.age2)!);
    return age >= range.first && age <= range.last;
  }) : base;
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

/** Intersection of documented seasons, not a claim about retirement or professional debut. */
export function sharedCareerWindow(matches: Match[], names: string[]) {
  const periods=names.map(name=>archiveIndex(matches).players.get(name)||[]);
  if(periods.some(rows=>!rows.length))return null;
  const first=Math.max(...periods.map(rows=>Math.min(...rows.map(m=>m.year))));
  const last=Math.min(...periods.map(rows=>Math.max(...rows.map(m=>m.year))));
  return first<=last?{first,last}:null;
}
