import Image from 'next/image';
import { tournamentMarkFor } from '@/lib/tournament-branding';
import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import Link from '@/components/IntentLink';
import PlayerFlag from '@/components/PlayerFlag';
import type { MatchRecord } from '@/types/deuce';
import { resolvedWinner, resolvedSetClosed } from '@/lib/deuce-score';
import { scorecardPresentation } from '@/lib/scorecard-presentation';
import styles from './match-scoreboard.module.css';

export function ScoreRows({match,playerLinks=false,language='es'}:{match:MatchRecord;playerLinks?:boolean;language?:'es'|'en'}){
  const winner=resolvedWinner(match);
  const en=language==='en';
  return <div className={styles.scores} role="group" aria-label={`${match.players[0].name} ${en?'vs':'contra'} ${match.players[1].name}${winner>=0?`. ${en?'Winner:':'Ganó'} ${match.players[winner].name}`:''}`} style={{'--set-count':Math.max(1,match.sets.length)} as CSSProperties}>
    {match.players.map((player,side)=><div className={styles.playerRow} data-score-player data-winner={winner===side||undefined} key={`${side}-${player.id}`}>
      <span className={styles.player}>
        <span className={styles.flag} aria-hidden="true"><PlayerFlag code={player.countryCode}/></span>
        <strong data-score-name title={player.name}>{playerLinks?<Link href={`/jugadores/${player.id}${match.tour==='wta'?'?tour=wta':''}`}>{player.name}</Link>:player.name}</strong>
        {winner===side&&<Check data-score-winner-mark className={styles.winnerMark} size={15} strokeWidth={2.5} aria-label={en?'Winner':'Ganador'}/>}
      </span>
      <span className={styles.sets} aria-label={en?`Score for ${player.name}`:`Marcador de ${player.name}`}>
        {match.sets.map((set,index)=>{
          const won=resolvedSetClosed(set)&&set.games[side]>set.games[1-side];
          const tie=set.tieBreak?.[side];
          return <span data-score-set data-set-won={won||undefined} key={index} aria-label={`Set ${index+1}: ${set.games[side]}${tie!=null?`, tie-break ${tie}`:''}`}>{set.games[side]}{tie!=null&&<sup aria-hidden="true">{tie}</sup>}</span>;
        })}
      </span>
    </div>)}
  </div>;
}

/** One presentation for every result; variants only control link semantics. */
export function MatchScoreboard({match,variant='card',prefetch=false,language='es'}:{match:MatchRecord;variant?:'card'|'compact'|'overlay'|'detail';showAction?:boolean;prefetch?:boolean;language?:'es'|'en'}){
  const view=scorecardPresentation(match);
  const en=language==='en';
  const round=en?view.round.replace(/^Cuartos de final$/i,'Quarterfinal').replace(/^Octavos de final$/i,'Round of 16').replace(/^Ronda de (\d+)$/i,'Round of $1').replace(/^Fase de grupos$/i,'Group stage'):view.round;
  const date=en&&view.dateTime?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(view.dateTime+'T12:00:00Z')):view.date;
  const brand=tournamentMarkFor(match.tournament,match.tour);
  const content=<>
    <header className={styles.event}><span className={styles.eventLogo} data-logo-circuit={brand.circuitFallback||undefined}><Image src={brand.src} width={26} height={20} alt="" unoptimized/></span><h3 title={match.tournament}>{match.tournament}</h3><span className={styles.round}>{round}</span></header>
    <ScoreRows match={match} playerLinks={variant==='detail'} language={language}/>
    <footer className={styles.foot}><span title={`${(match.tour||'atp').toUpperCase()}${view.category?` · ${view.category}`:''}${view.status?` · ${view.status}`:''}`}>{!brand.circuitFallback&&<span className={styles.tour}>{(match.tour||'atp').toUpperCase()}</span>}{view.category&&<>{!brand.circuitFallback&&<span aria-hidden="true">·</span>}<span className={styles.category}>{view.category}</span></>}{view.status&&<strong title={view.status} aria-label={view.status}>{view.status.startsWith('W/O')?'W/O':view.status}</strong>}</span><time dateTime={view.dateTime} title={date} aria-label={date}>{date.replace(/^Semana del /,'Sem. ')}</time></footer>
  </>;
  return <div className={styles.host} data-match-scoreboard>
    {variant==='detail'?<section className={styles.card} data-scorecard data-round={view.tone} data-tour={match.tour}>{content}</section>:<Link className={styles.card} data-scorecard data-round={view.tone} data-tour={match.tour} href={match.href} prefetch={prefetch} aria-label={`${match.tournament}, ${round}: ${match.players[0].name} ${en?'vs':'contra'} ${match.players[1].name}`}>{content}</Link>}
  </div>;
}
