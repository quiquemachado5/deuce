import type { MatchRecord } from '@/types/deuce';
import { MatchScoreboard } from './MatchScoreboard';
export function MatchArchivePage({ matches }: { matches:MatchRecord[] }) {
  return <div className="match-archive-grid">{matches.map(match=><MatchScoreboard match={match} key={match.id}/>)}</div>;
}
