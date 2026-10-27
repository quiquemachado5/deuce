import type { Match } from '@/lib/types';
import { toMatchRecord } from '@/data/map-match';
import { MatchScoreboard } from '@/components/deuce/MatchScoreboard';
export default function MatchHero({match,reduced=false}:{match:Match;reduced?:boolean}) {
  const record=toMatchRecord(match);
  if(reduced)return <MatchScoreboard match={record}/>;
  return <header className="deuce-match-detail">
    <h1 className="nc-sr">{record.players.map(player=>player.name).join(' contra ')}</h1>
    <MatchScoreboard match={record} variant="detail"/>
  </header>;
}
