import Link from 'next/link';
import type { Match } from '@/lib/types';
import { toMatchRecord } from '@/data/map-match';
import { ScoreRows, MatchScoreboard } from '@/components/deuce/MatchScoreboard';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { browserCategory } from '@/lib/match-browser';
import { surfaceLabel } from '@/lib/surface';
export default function MatchHero({match,reduced=false}:{match:Match;reduced?:boolean}) {
  const record=toMatchRecord(match),event=tournamentDirectory([match])[0];
  if(reduced)return <MatchScoreboard match={record}/>;
  return <header className={`deuce-match-detail${record.isFinal?' is-final':''}`}>
    <div className="deuce-match-meta"><Link href={event?`/${event.slug}/${match.year}`:'/tournaments'}>{record.tournament} · {match.year} ↗</Link><span>{[record.round,browserCategory(match),surfaceLabel[match.surface]].filter(Boolean).join(' · ')}</span></div>
    <h1>{record.players.map(player=>player.name).join(' contra ')}</h1>
    <ScoreRows match={record} playerLinks/>
  </header>;
}
