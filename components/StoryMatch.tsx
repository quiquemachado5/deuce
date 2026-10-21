import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Match } from '@/lib/types'
import { tournamentName } from '@/lib/labels'
import { matchStory, roundLabel } from '@/lib/editorial'
export default function StoryMatch({match,description}:{match:Match;description?:string}) {
  return <Link className="story-match dossier-match-row" href={`/match/${match.match_id}`}><span>{tournamentName(match.tournament)} · {match.year} · {roundLabel(match.round)}</span><h3>{match.player1.name} <span className="versus"> contra </span> {match.player2.name}</h3><strong className="story-score" aria-label={`Resultado: ${match.final_score}`}>{match.final_score.split(/\s+/).map((set,index)=><span key={index}>{set.split(/[–-]/).map((score,side)=><b key={side} className={match.score_summary.games[index]?.[side]>match.score_summary.games[index]?.[1-side]?'set-won':undefined}>{side>0&&<em>–</em>}{score}</b>)}</span>)}</strong><p>{description || matchStory(match).headline}</p><ArrowRight size={18} aria-hidden="true"/></Link>
}
