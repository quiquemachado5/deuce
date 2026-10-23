import type { Match } from '@/lib/types';
import { ScoreRows } from './deuce/MatchScoreboard';
import { toMatchRecord } from '@/data/map-match';
export default function SetScoreboard({ match, compact = false }: { match: Match; compact?: boolean }) {
  return <div className={compact ? 'deuce-score-inline compact' : 'deuce-score-inline'}><ScoreRows match={toMatchRecord(match)} playerLinks /></div>;
}
