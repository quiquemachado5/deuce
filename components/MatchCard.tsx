import type { Match } from '@/lib/types';
import { MatchScoreboard } from './deuce/MatchScoreboard';
import { toMatchRecord } from '@/data/map-match';
export default function MatchCard({ match }: { match: Match }) {
  return <MatchScoreboard match={toMatchRecord(match)} />;
}
