import type { Match, Tour } from './types';
import { filterArchive, type ArchiveFilter } from './archive-index';
import { eligibleMatch } from './quality';
import { chronological } from './editorial';
import { SURFACES } from './surface';
import { playerIdentity } from './explore';

export type ComparisonFilter = ArchiveFilter & { age?: string; minimum?: string };
function ageRange(value: string) {
  if (/^\d+\+$/.test(value)) return { first: Number(value.slice(0, -1)), last: Infinity };
  const match = value.match(/^(\d+)-(\d+)$/);
  if (match) return { first: Number(match[1]), last: Number(match[2]) };
  const exact = Number(value);
  return Number.isFinite(exact) ? { first: exact, last: exact } : null;
}

function identitySide(match: Match, identity: string, tour: Tour): 1 | 2 | null {
  if ((match.tour || 'atp') !== tour) return null;
  if (playerIdentity(match.player1.name, tour) === identity) return 1;
  if (playerIdentity(match.player2.name, tour) === identity) return 2;
  return null;
}

export function comparisonPlayerSide(match: Match, name: string, tour: Tour): 1 | 2 | null {
  return identitySide(match, playerIdentity(name, tour), tour);
}

export function comparisonPlayerWon(match: Match, name: string, tour: Tour) {
  const side = comparisonPlayerSide(match, name, tour);
  return side !== null && match.winner === side;
}

export function comparePlayer(matches: Match[], name: string, q: ComparisonFilter, tour: Tour = q.tour === 'wta' ? 'wta' : 'atp') {
  const identity = playerIdentity(name, tour);
  const base = filterArchive(matches.filter(match => identitySide(match, identity, tour) !== null), q);
  const knownAge = base.filter(match => {
    const side = identitySide(match, identity, tour);
    return Number.isFinite(side === 1 ? match.context?.age1 : match.context?.age2);
  });
  const range = q.age && q.age !== 'all' ? ageRange(q.age) : null;
  const selected = range ? knownAge.filter(match => {
    const side = identitySide(match, identity, tour);
    const age = Math.floor((side === 1 ? match.context!.age1 : match.context!.age2)!);
    return age >= range.first && age <= range.last;
  }) : base;
  const eligible = selected.filter(eligibleMatch).sort(chronological);
  const won = eligible.filter(match => match.winner === identitySide(match, identity, tour)).length;
  const finals = eligible.filter(m => m.round.toLowerCase() === 'final');
  const ranking = eligible.filter(match => {
    const side = identitySide(match, identity, tour);
    return match.context?.rankLabel === 'Ranking al jugar' && Number(side === 1 ? match.context.rank2 : match.context.rank1) > 0;
  });
  const top10 = ranking.filter(match => {
    const side = identitySide(match, identity, tour);
    return Number(side === 1 ? match.context!.rank2 : match.context!.rank1) <= 10;
  });
  const surfaces = SURFACES.map(surface => {
    const sample = eligible.filter(match => match.surface === surface);
    const surfaceWon = sample.filter(match => match.winner === identitySide(match, identity, tour)).length;
    return { surface, played: sample.length, won: surfaceWon, rate: sample.length ? surfaceWon / sample.length * 100 : null };
  });
  const minimum = ['5', '20', '50'].includes(q.minimum || '') ? Number(q.minimum) : 20;
  return { name, matches: eligible, base: base.length, ageCoverage: knownAge.length, excluded: selected.length - eligible.length,
    played: eligible.length, won, lost: eligible.length - won, minimum, sufficient: eligible.length >= minimum,
    rate: eligible.length ? won / eligible.length * 100 : null,
    finals: finals.length, titles: finals.filter(match => match.winner === identitySide(match, identity, tour)).length,
    surfaces,
    ranking: ranking.length, top10Played: top10.length, top10Won: top10.filter(match => match.winner === identitySide(match, identity, tour)).length,
    stats: eligible.filter(m => m.statistics.length).length, exactDates: eligible.filter(m => m.context?.dateLabel === 'Fecha del partido').length,
  };
}

/** Head-to-head rows are the intersection of both players' filtered samples. */
export function comparisonHeadToHead(matches: Match[], names: string[], samples: Match[][], tour: Tour = 'atp') {
  const identities = new Set(names.map(name => playerIdentity(name, tour)));
  const sampleIds=samples.map(sample=>new Set(sample.map(match=>match.match_id)));
  return matches
    .filter(match => (match.tour || 'atp') === tour
      && identities.has(playerIdentity(match.player1.name, tour))
      && identities.has(playerIdentity(match.player2.name, tour)))
    .filter(eligibleMatch)
    .filter(match=>sampleIds.every(ids=>ids.has(match.match_id)))
    .sort((a,b)=>chronological(b,a));
}

export function comparisonLeadTimeline(matches: Match[], names: string[], tour: Tour = 'atp') {
  const identities=names.map(name=>playerIdentity(name,tour));
  const wins:[number,number]=[0,0];
  let previousLeader:0|1|null=null;
  return [...matches].sort(chronological).flatMap(match=>{
    const winnerName=match.winner===1?match.player1.name:match.winner===2?match.player2.name:'';
    const winner=identities.indexOf(playerIdentity(winnerName,tour));
    if(winner!==0&&winner!==1)return [];
    wins[winner]+=1;
    const leader:0|1|null=wins[0]===wins[1]?null:wins[0]>wins[1]?0:1;
    const leaderChanged=leader!==null&&previousLeader!==null&&leader!==previousLeader;
    if(leader!==null)previousLeader=leader;
    return [{match,wins:[...wins] as [number,number],leader,leaderChanged}];
  });
}

/** Intersection of documented seasons, not a claim about retirement or professional debut. */
export function sharedCareerWindow(matches: Match[], names: string[], tour: Tour = 'atp') {
  const periods = names.map(name => {
    const identity = playerIdentity(name, tour);
    return matches.filter(match => identitySide(match, identity, tour) !== null);
  });
  if(periods.some(rows=>!rows.length))return null;
  const first=Math.max(...periods.map(rows=>Math.min(...rows.map(m=>m.year))));
  const last=Math.min(...periods.map(rows=>Math.max(...rows.map(m=>m.year))));
  return first<=last?{first,last}:null;
}
