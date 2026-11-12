import {reviewedHistoricalEdition} from './reviewed-historical-editions';
import {isReviewedOutsideMainDraw} from './reviewed-fixture-scope';
import { exactDay } from './archive-freshness';
import { matchDiscipline } from './match-discipline';
import { eligibleMatch } from './quality';
import type { Match, Tour } from './types';
import {canonicalMatchId,isReviewedMatchAlias} from './match-identity-aliases';
import {finalsIdentity} from './finals-identity';

export const PUBLICATION_CATEGORIES: Readonly<Record<Tour, ReadonlySet<string>>> = {
  atp: new Set(['Grand Slam', 'Masters 1000', 'ATP 500', 'ATP 250', 'ATP Finals','ATP International Series Gold']),
  wta: new Set(['Grand Slam', 'WTA 1000', 'WTA 500', 'WTA 250', 'WTA Finals']),
};

export const PROVIDER_PUBLICATION_TIERS: Readonly<Record<Tour, string>> = {
  atp: 'grand_slam,atp_1000,atp_500,atp_250,atp_finals',
  wta: 'grand_slam,wta_1000,wta_500,wta_250,wta_finals',
};

const providerPublicationTierSets: Readonly<Record<Tour, ReadonlySet<string>>> = {
  atp: new Set(PROVIDER_PUBLICATION_TIERS.atp.split(',')),
  wta: new Set(PROVIDER_PUBLICATION_TIERS.wta.split(',')),
};

/** Raw modern rows are eligible for detail calls only in the public product tiers. */
export function providerTierInPublicationScope(row: { tier?: unknown }, tour: Tour) {
  return typeof row.tier === 'string' && providerPublicationTierSets[tour].has(row.tier.trim().toLowerCase())||finalsIdentity({...row,tour})!==null;
}

const normalized = (value: string) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const normalizedScore = (value: string, winner: 1 | 2) => value
  .replace(/[\u2012-\u2015\u2212]/g, '-')
  .replace(/(^|[\s,])(\d+)-(\d+)/g, (_set, prefix: string, first: string, second: string) =>
    `${prefix}${winner === 1 ? `${first}-${second}` : `${second}-${first}`}`)
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const tourOf = (match: Pick<Match, 'tour'>): Tour => match.tour === 'wta' ? 'wta' : 'atp';

/** Category and discipline contract, also usable for unresolved draw entries. */
export function isInPublicationScope(match: Match) {
  const tour = tourOf(match);
  if(isReviewedOutsideMainDraw(match))return false;
  if(match.category==='ATP International Series Gold'&&!reviewedHistoricalEdition(match))return false;
  // RFET / WTA 1164: the April 6–12 Madrid event is WTA 125, not Mutua Madrid WTA 1000.
  // Also excludes stale immutable baselines prepared before the provider edition was corrected.
  const day=match.context?.date?.slice(0,10)||'';
  if(tour==='wta'&&match.year===2026&&match.tournament==='Madrid'&&day>='2026-04-06'&&day<='2026-04-12')return false;
  return match.context?.qualifying!==true && !/^Previa(?: ·|$)/.test(match.round) && !/^Q\d+$/i.test(match.round)
    && PUBLICATION_CATEGORIES[tour].has(match.category)
    && matchDiscipline(match) === 'singles';
}

/** The one public result universe used by reads, snapshots and every aggregate. */
export function isPublishedMatch(match: Match) {
  return isInPublicationScope(match) && eligibleMatch(match);
}

/**
 * A semantic key joins provider identities only when every documented identity
 * field is present. Rows with incomplete provenance remain separate.
 */
export function publishedMatchDuplicateKey(match: Match): string | null {
  if(isReviewedMatchAlias(match.match_id))return 'reviewed-contest:'+canonicalMatchId(match.match_id);
  const day = exactDay(match.context?.date);
  if (!day || !match.tournament || !match.round || !match.final_score || (match.winner !== 1 && match.winner !== 2)) return null;
  const winner = match.winner === 1 ? match.player1.name : match.player2.name;
  const loser = match.winner === 1 ? match.player2.name : match.player1.name;
  if (!winner || !loser) return null;
  return JSON.stringify([
    tourOf(match), match.year,match.category,day, normalized(match.tournament), normalized(match.round),
    normalized(winner), normalized(loser), normalizedScore(match.final_score, match.winner),
  ]);
}

function documentedValue(match: Match) {
  return match.statistics.length * 10_000
    + match.point_tape.length * 100
    + (match.context?.dateLabel === 'Fecha del partido' ? 10 : 0)
    + (match.context?.rank1 != null && match.context?.rank2 != null ? 2 : 0)
    + (match.context?.minutes != null ? 1 : 0);
}

function preferredDuplicate(a: Match, b: Match) {
  if(isReviewedMatchAlias(a.match_id)&&canonicalMatchId(a.match_id)===canonicalMatchId(b.match_id))return a.match_id===canonicalMatchId(a.match_id)?a:b;
  const evidence = documentedValue(a) - documentedValue(b);
  if (evidence) return evidence > 0 ? a : b;
  return a.match_id.localeCompare(b.match_id) <= 0 ? a : b;
}

/** Filter and semantically deduplicate while retaining deterministic source IDs. */
export function publishedMatches<T extends Match>(matches: readonly T[]): T[] {
  const scoped = matches.filter(isPublishedMatch);
  const canonical = new Map<string, T>();
  for (const match of scoped) {
    const key = publishedMatchDuplicateKey(match);
    if (!key) continue;
    const current = canonical.get(key);
    canonical.set(key, current ? preferredDuplicate(current, match) as T : match);
  }
  return scoped.filter(match => {
    const key = publishedMatchDuplicateKey(match);
    return !key || canonical.get(key) === match;
  });
}

export function publicationScopeCounts(matches: readonly Match[]) {
  const published = publishedMatches(matches);
  return {
    matches: published.length,
    tours: {
      atp: published.filter(match => tourOf(match) === 'atp').length,
      wta: published.filter(match => tourOf(match) === 'wta').length,
    },
  };
}
