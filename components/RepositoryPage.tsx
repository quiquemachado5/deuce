import Link from 'next/link'
import Shell from './Shell'
import { dataMode } from '@/lib/data'
import Repository from './Repository'
import { comparisonHref, rivalryDirectory } from '@/lib/explore'
import { courtPhoto } from '@/lib/imagery'
import { playerPhoto } from '@/lib/player-imagery'
import { tournamentName } from '@/lib/labels'
import { getMatches, getAnalyzableMatches } from '@/lib/data'
import { savedHighlights } from '@/lib/editorial-data'
import { matchStory, twoSetComeback, criticalPoints } from '@/lib/editorial'
import { parseRepositoryQuery, selectRepository } from '@/lib/repository-query'
export default async function RepositoryPage({ query = {}, indexOnly = false }: { query?: Record<string,string|undefined>; indexOnly?: boolean }) {
  const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string,string] => Boolean(entry[1])))
  let filters
  try { filters = parseRepositoryQuery(params) } catch (error) { return <Shell mode={dataMode()}><div className="page-frame editorial-page"><h1>Revisa los filtros</h1><p>{error instanceof Error ? error.message : 'La búsqueda no es válida.'}</p><Link href="/buscar">Abrir el índice sin filtros</Link></div></Shell> }
  filters.limit = 25
  const all = await getMatches(undefined, undefined, true)
  const result = selectRepository(all, filters)
  const detailed = indexOnly ? [] : await getAnalyzableMatches()
  const pointMatch = detailed.filter(m=>criticalPoints(m.point_tape).length>0 && m.round==='Final').sort((a,b)=>b.year-a.year)[0]
  const comeback = all.filter(twoSetComeback).sort((a,b)=>b.year-a.year)[0]
  const rivalry = !indexOnly ? rivalryDirectory(all)[0] : undefined
  const readings = [
    ...(pointMatch ? [{ href: `/match/${pointMatch.match_id}`, title: matchStory(pointMatch).headline, subtitle: `${pointMatch.player1.name} – ${pointMatch.player2.name} · ${tournamentName(pointMatch.tournament)} ${pointMatch.year}`, image: courtPhoto(pointMatch.tournament)?.src, alt: courtPhoto(pointMatch.tournament)?.alt || '', kind: 'Punto a punto' }] : []),
    ...(comeback ? [{ href: `/match/${comeback.match_id}`, title: matchStory(comeback).headline, subtitle: `${tournamentName(comeback.tournament)} · ${comeback.year} · ${comeback.final_score}`, image: playerPhoto(comeback.winner===1 ? comeback.player1.name : comeback.player2.name)?.src, alt: comeback.winner===1 ? comeback.player1.name : comeback.player2.name, kind: 'La remontada' }] : []),
    ...(rivalry ? [{ href: comparisonHref(rivalry.names[0],rivalry.names[1]), title: rivalry.names.join(' – '), subtitle: 'Victorias en este archivo, no el cara a cara completo.', image: playerPhoto(rivalry.names[0])?.src, alt: rivalry.names[0], kind: 'Una rivalidad', facts: (['hard','clay','grass'] as const).flatMap(surface=>{const rows=rivalry.matches.filter(m=>m.surface===surface);const wins=rows.filter(m=>(m.winner===1?m.player1.name:m.player2.name)===rivalry.names[0]).length;return rows.length ? [`${({hard:'Dura',clay:'Tierra',grass:'Hierba'})[surface]} ${wins}–${rows.length-wins}`] : []}) }] : []),
  ]
  const enriched = indexOnly || filters.query ? await savedHighlights(result.matches) : result.matches
  return <Repository initialMatches={enriched} initialTotal={result.total} initialQuery={filters} indexOnly={indexOnly} readings={readings} />
}
