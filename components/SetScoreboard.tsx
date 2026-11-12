import type { Match } from '@/lib/types';
import { MatchScoreboard } from './deuce/MatchScoreboard';
import { toMatchRecord } from '@/data/map-match';
export default function SetScoreboard({ match }: { match: Match; compact?: boolean }) {
  return <MatchScoreboard match={toMatchRecord(match)}/>;
}
