import { Info } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { Match } from '@/lib/types'
import { playerPhoto } from '@/lib/player-imagery'
import { playerSlug } from '@/lib/explore'
export default function MatchScoreboard({ match, sets }: { match: Match; sets: number[][] }) {
  const ties = match.final_score.split(/\s+/).map(set => set.match(/\((\d+)\)/)?.[1])
  const retirement=/retir|abandon/i.test(match.status)
  const review = match.quality?.result === 'review'
  return <section className="scorebook scorebook-table" aria-label="Marcador por sets">

    <div className="score-table-wrap"><table><caption>{retirement ? 'Abandono' : review ? 'Marcador del proveedor · en revisión' : 'Resultado final'}</caption><thead><tr><th scope="col"><span className="sr-only">Jugador</span></th>{sets.map((_,i) => <th scope="col" key={i}>Set {i+1}</th>)}</tr></thead><tbody>{[match.player1,match.player2].map((player,index) => { const photo=playerPhoto(player.name); const winner = !review && match.winner === index+1
      return <tr key={player.name} className={`side-${index+1}${winner ? ' is-winner' : ''}`}><th scope="row"><Link className="scorebook-person" href={`/players/${playerSlug(player.name)}`}><span className="scorebook-portrait">{photo ? <Image src={photo.thumbnail || photo.src} alt="" fill sizes="(max-width: 600px) 36px, 88px" priority unoptimized /> : <b>{player.name.split(' ').map(s=>s[0]).slice(-2).join('')}</b>}</span><span className="scorebook-person-name"><strong>{player.name}</strong>{winner && <small><Check size={13}/> Ganador</small>}</span></Link></th>{sets.map((set,i) => <td key={i} className={set[index]>set[1-index] ? 'won' : ''}><b className={ties[i]?'tie-set':undefined}>{ties[i]?`${set[index]}–${set[1-index]}(${ties[i]})`:set[index]}</b></td>)}</tr>
    })}</tbody></table></div>
    <Link className="score-credit-link" href={`/credits?q=${encodeURIComponent(`${match.player1.name}|${match.player2.name}`)}`} aria-label="Créditos de las fotografías"><Info size={16}/></Link>
  </section>
}
