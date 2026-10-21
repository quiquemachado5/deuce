import type { Match } from '@/lib/types'
import { decisiveMoments } from '@/lib/editorial'
export default function MatchMoments({match}:{match:Match}) {
  const moments=decisiveMoments(match)
  if(!moments.length) return null
  return <section className="match-moments"><h2>Así se rompió</h2><ol>{moments.map(({point,label})=><li key={point.point_number}><span>Set {point.set} · juego {point.game}</span><p>{label}</p></li>)}</ol></section>
}
